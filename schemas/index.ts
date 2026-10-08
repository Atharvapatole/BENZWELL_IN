import { z } from 'zod';

// -----------------------------------------------------------------------------
// AUTH & CUSTOMER SCHEMAS
// -----------------------------------------------------------------------------

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().min(10, 'Please provide a valid phone number').max(15).optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const LoginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const AdminLoginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'Verification code must be exactly 6 digits').regex(/^[0-9]+$/, 'Must be numeric'),
});

export const ResendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const ProfileUpdateSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().max(20).optional().nullable(),
});

// -----------------------------------------------------------------------------
// PRODUCT & CATEGORY SCHEMAS
// -----------------------------------------------------------------------------

export const ProductCategorySchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
  description: z.string().max(500).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  seo_title: z.string().max(100).optional().nullable(),
  seo_description: z.string().max(200).optional().nullable(),
});

export const ProductSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  short_description: z.string().max(300).optional().nullable(),
  description: z.string().min(10, 'Full description is required'),
  price: z.number().min(0, 'Price must be 0 or positive'),
  sale_price: z.number().min(0).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  category_id: z.string().uuid('Invalid category ID').optional().nullable(),
  product_type: z.enum(['digital', 'ebook', 'course', 'template', 'bundle', 'guide']).default('digital'),
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  main_image: z.string().url().optional().nullable().or(z.literal('')),
  gallery: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([]),
  what_is_included: z.array(z.string()).default([]),
  who_is_it_for: z.array(z.string()).default([]),
  file_info: z.object({
    format: z.string().optional(),
    size: z.string().optional(),
    pages_or_duration: z.string().optional(),
    version: z.string().optional(),
  }).default({}),
  delivery_type: z.enum(['upload', 'external_url']).default('upload'),
  external_download_url: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(
      (url) => {
        if (!url || url.trim() === '') return true;
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
          const host = parsed.hostname.toLowerCase();
          if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '0.0.0.0' ||
            host === '::1' ||
            host.startsWith('10.') ||
            host.startsWith('192.168.') ||
            host === '169.254.169.254'
          ) {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
      {
        message: 'Must be a valid public HTTP or HTTPS download URL',
      }
    ),
  download_limit: z.number().int().min(1).default(10),
  download_expiry_days: z.number().int().min(1).default(365),
  seo_title: z.string().max(100).optional().nullable(),
  seo_description: z.string().max(200).optional().nullable(),
});

// -----------------------------------------------------------------------------
// COUPON SCHEMA
// -----------------------------------------------------------------------------

export const CouponSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/, 'Coupon code must be uppercase alphanumeric'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive('Discount value must be greater than 0'),
  min_order_amount: z.number().min(0).default(0),
  max_discount_amount: z.number().positive().optional().nullable(),
  usage_limit: z.number().int().positive().optional().nullable(),
  per_user_limit: z.number().int().positive().default(1),
  valid_from: z.string(),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  applicable_category_ids: z.array(z.string()).default([]),
  applicable_product_ids: z.array(z.string()).default([]),
  creator_name: z.string().optional().nullable(),
  creator_commission_type: z.enum(['percentage', 'fixed']).optional().nullable(),
  creator_commission_value: z.number().positive().optional().nullable(),
});

// -----------------------------------------------------------------------------
// CHECKOUT & PAYMENT SCHEMAS
// -----------------------------------------------------------------------------

export const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid('Invalid product ID'),
      quantity: z.number().int().min(1).max(5).default(1),
    })
  ).min(1, 'Cart cannot be empty'),
  couponCode: z.string().optional().nullable(),
  customerInfo: z.object({
    fullName: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
  }),
});

export const VerifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// -----------------------------------------------------------------------------
// BLOG & PAGE SCHEMAS
// -----------------------------------------------------------------------------

export const BlogSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(20, 'Blog content must be at least 20 characters'),
  featured_image: z.string().url().optional().nullable().or(z.literal('')),
  category_id: z.string().uuid().optional().nullable(),
  author_name: z.string().min(2).default('BenzWell Editorial Team'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tags: z.array(z.string()).default([]),
  seo_title: z.string().max(100).optional().nullable(),
  seo_description: z.string().max(200).optional().nullable(),
});

export const PageBlockSchema: z.ZodType<any> = z.object({
  id: z.string(),
  type: z.enum([
    'section',
    'container',
    'hero',
    'heading',
    'paragraph',
    'image',
    'button',
    'product_grid',
    'category_grid',
    'testimonials',
    'faq',
    'blog_grid',
    'spacer',
    'divider',
    'rich_text',
    'custom_html',
  ]),
  props: z.record(z.any()),
  styles: z.record(z.any()).optional(),
  children: z.lazy(() => z.array(PageBlockSchema)).optional(),
});

export const PageSchema = z.object({
  title: z.string().min(2).max(150),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  content_json: z.object({
    sections: z.array(PageBlockSchema),
  }),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  seo_title: z.string().max(100).optional().nullable(),
  seo_description: z.string().max(200).optional().nullable(),
});

// -----------------------------------------------------------------------------
// REVIEW SCHEMA
// -----------------------------------------------------------------------------

export const ReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional().nullable(),
  comment: z.string().min(5, 'Review comment must be at least 5 characters').max(1000),
});
