'use client';

import React, { useState } from 'react';
import { submitReviewAction } from '@/actions/reviews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, X, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
}

export function ReviewModal({
  isOpen,
  onClose,
  productId,
  productTitle,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await submitReviewAction({
      productId,
      rating,
      title,
      comment,
    });

    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } else {
      setError(res.error || 'Failed to submit review.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl bg-[#161822] border border-zinc-700 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Leave a Product Review</h3>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-sm">
              for <strong>{productTitle}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-2 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
            <h4 className="font-bold text-sm text-white">Review Submitted!</h4>
            <p className="text-xs text-zinc-300">
              Thank you for your feedback. Your review will be published publicly as soon as it is approved by our team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Verified Buyer Note */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/40 text-sky-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Verified Buyer Review • Moderated for authenticity</span>
            </div>

            {/* Star Rating */}
            <div className="space-y-1.5 text-center sm:text-left">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Your Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 text-2xl transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (hoverRating !== null ? hoverRating >= star : rating >= star)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-zinc-300 ml-2">
                  {rating === 5
                    ? '5.0 — Excellent'
                    : rating === 4
                    ? '4.0 — Good'
                    : rating === 3
                    ? '3.0 — Average'
                    : rating === 2
                    ? '2.0 — Poor'
                    : '1.0 — Terrible'}
                </span>
              </div>
            </div>

            <Input
              label="Review Headline (Optional)"
              placeholder="e.g. Exceptional quality, highly actionable!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Detailed Feedback
              </label>
              <textarea
                rows={4}
                required
                placeholder="Share how this digital product helped you, what stood out, and key takeaways..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs text-zinc-400">
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isLoading} className="bg-sky-500 hover:bg-sky-400 text-white font-bold">
                Submit Review
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
