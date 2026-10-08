'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';

export interface SubmitReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
}

/**
 * Customer submits a product review.
 * Strictly verifies that the customer has an active purchase entitlement for the product.
 */
export async function submitReviewAction(payload: SubmitReviewPayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'You must be logged in to leave a review.' };
    }

    const { productId, rating, title, comment } = payload;

    if (!productId) {
      return { success: false, error: 'Invalid product ID.' };
    }

    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: 'Please select a star rating between 1 and 5.' };
    }

    if (!comment || !comment.trim() || comment.trim().length < 5) {
      return { success: false, error: 'Please write a review comment (minimum 5 characters).' };
    }

    const adminDb = createAdminClient();

    // 1. Verify that user actually purchased this product
    const { data: entitlement, error: entError } = await adminDb
      .from('customer_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (entError || !entitlement) {
      return {
        success: false,
        error: 'Access denied: Only verified purchasers who own this product can submit a review.',
      };
    }

    // 2. Check if user already submitted a review for this product
    const { data: existingReview } = await adminDb
      .from('reviews')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existingReview) {
      return {
        success: false,
        error: 'You have already submitted a review for this product. Thank you!',
      };
    }

    // 3. Insert new review with status = 'pending'
    const { data: inserted, error: insertError } = await adminDb
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: user.id,
        rating: Math.round(rating),
        title: title?.trim() || null,
        comment: comment.trim(),
        is_verified_purchase: true,
        status: 'pending', // Pending Admin Moderation
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to submit review:', insertError);
      return { success: false, error: insertError.message || 'Failed to submit review.' };
    }

    revalidatePath('/account/downloads');
    revalidatePath('/account/orders');
    return {
      success: true,
      review: inserted,
      message: 'Thank you! Your review has been submitted and is awaiting administrative approval.',
    };
  } catch (err: any) {
    console.error('submitReviewAction exception:', err);
    return { success: false, error: err?.message || 'An unexpected error occurred.' };
  }
}

/**
 * Admin: Update review status (approve or reject)
 */
export async function updateReviewStatusAction(reviewId: string, status: 'approved' | 'rejected') {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from('reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select('*, product:products(id, slug)')
      .single();

    if (error || !updated) {
      return { success: false, error: error?.message || 'Review not found' };
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: status === 'approved' ? 'APPROVE_REVIEW' : 'REJECT_REVIEW',
      entity: 'reviews',
      entity_id: reviewId,
      metadata: { status, productId: updated.product_id },
    });

    if (updated.product?.slug) {
      revalidatePath(`/product/${updated.product.slug}`);
    }
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update review status' };
  }
}

/**
 * Admin: Delete review
 */
export async function deleteReviewAction(reviewId: string) {
  try {
    const { user, profile } = await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile.email,
      action: 'DELETE_REVIEW',
      entity: 'reviews',
      entity_id: reviewId,
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete review' };
  }
}

/**
 * Public: Get approved reviews for a product
 */
export async function getProductReviewsAction(productId: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*, user:profiles(full_name, avatar_url)')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, reviews: [] };
    }

    return { success: true, reviews: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch reviews', reviews: [] };
  }
}
