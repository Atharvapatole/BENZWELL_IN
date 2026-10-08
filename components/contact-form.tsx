'use client';

import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertCircle,
  Paperclip,
  X,
  FileText,
  Loader2,
  Bot,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { createSupportTicketAction } from '@/actions/support';
import { uploadSupportAttachmentAction } from '@/actions/support-ai';

const ISSUE_CATEGORIES = [
  { value: 'Purchased product not received', label: 'Purchased product not received' },
  { value: 'Payment completed but product unavailable', label: 'Payment completed but product unavailable' },
  { value: 'Download link expired', label: 'Download link expired' },
  { value: 'Download problem', label: 'Download problem' },
  { value: 'Incorrect product access', label: 'Incorrect product access' },
  { value: 'Login/account problem', label: 'Login / Account problem' },
  { value: 'Password reset problem', label: 'Password reset problem' },
  { value: 'Payment failed', label: 'Payment failed' },
  { value: 'Payment pending', label: 'Payment pending' },
  { value: 'Refund-related issue', label: 'Refund-related issue' },
  { value: 'Product/content issue', label: 'Product / Content inquiry' },
  { value: 'Website technical issue', label: 'Website technical issue' },
  { value: 'Other', label: 'Other General Inquiry' },
];

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0].value);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [benzwellOrderNumber, setBenzwellOrderNumber] = useState('');
  const [razorpayOrderId, setRazorpayOrderId] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (attachments.length >= 3) {
      setUploadError('Maximum 3 attachments allowed.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await uploadSupportAttachmentAction(formData);
    setIsUploading(false);

    if (res.success && res.attachment) {
      setAttachments((prev) => [...prev, res.attachment]);
    } else {
      setUploadError(res.error || 'Failed to upload attachment.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const res = await createSupportTicketAction({
      name,
      email,
      phone,
      category,
      subject,
      description: message,
      benzwellOrderNumber,
      razorpayOrderId,
      attachments,
    });

    setIsLoading(false);

    if (res.success && res.ticketNumber) {
      setTicketNumber(res.ticketNumber);
      setSubmitted(true);
    } else {
      setError(res.error || 'Failed to submit support ticket. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="p-8 text-center rounded-3xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 space-y-4 shadow-glass animate-in fade-in duration-300">
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Ticket Created Successfully
          </span>
          <h3 className="font-extrabold text-2xl text-white mt-1">
            Ticket #{ticketNumber}
          </h3>
        </div>
        <p className="text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
          Thank you, <strong>{name}</strong>! Your official support ticket has been recorded in our system. A notification has been dispatched to our staff at <strong>info@benzwell.in</strong>. You will receive an email response directly at <strong>{email}</strong> within 24 hours.
        </p>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 max-w-md mx-auto text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
            <Bot className="w-4 h-4" />
            <span>Need Immediate Automated Help?</span>
          </div>
          <p className="text-xs text-zinc-400">
            You can also chat with our 24/7 Support AI for instant order verification and 5-minute download link generation.
          </p>
          <Link
            href="/support-ai"
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 pt-1"
          >
            <span>Launch Support AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSubmitted(false);
              setMessage('');
              setSubject('');
              setBenzwellOrderNumber('');
              setRazorpayOrderId('');
              setAttachments([]);
            }}
            className="text-xs border-emerald-700 text-emerald-300 hover:bg-emerald-900/40"
          >
            Submit Another Inquiry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Your Full Name"
          required
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email Address"
          type="email"
          required
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Phone Number (Optional)"
          type="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* Issue Category Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Issue Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-11 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 px-3.5 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {ISSUE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-zinc-900 text-white">
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Order References */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="BenzWell Order ID (Optional)"
          placeholder="e.g. BZ-20260911-0001"
          value={benzwellOrderNumber}
          onChange={(e) => setBenzwellOrderNumber(e.target.value)}
        />
        <Input
          label="Razorpay Order / Payment ID (Optional)"
          placeholder="e.g. order_P123456789 or pay_..."
          value={razorpayOrderId}
          onChange={(e) => setRazorpayOrderId(e.target.value)}
        />
      </div>

      {/* Subject */}
      <Input
        label="Subject / Problem Summary"
        required
        placeholder="Brief summary of the issue..."
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      {/* Message Textarea */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
          Detailed Description <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={5}
          required
          placeholder="Please describe the issue in detail. If this is regarding a download or payment, include timestamps or error messages."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 p-3.5 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Attachments Section */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
          <span>Attachments / Screenshots (Optional, Max 3 • 5MB each)</span>
          <span className="text-[11px] text-zinc-400 font-normal">PNG, JPG, WEBP, PDF</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || attachments.length >= 3}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl text-xs gap-2 border-zinc-300 dark:border-zinc-700"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            <span>Upload Screenshot</span>
          </Button>

          {/* Attachment list */}
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span className="truncate max-w-[140px]">{att.originalFilename}</span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(idx)}
                className="text-zinc-400 hover:text-red-400 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {uploadError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{uploadError}</span>
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-2 flex items-center justify-between">
        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          className="font-bold shadow-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100"
        >
          <span>Submit Support Ticket</span>
        </Button>

        <div className="text-right">
          <p className="text-[11px] text-zinc-500">Official Support • info@benzwell.in</p>
        </div>
      </div>
    </form>
  );
}
