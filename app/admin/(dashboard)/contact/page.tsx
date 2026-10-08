import React from 'react';
import { getContactMessagesAction } from '@/actions/contact';
import { ContactCRM } from '@/components/admin/contact-crm';
import { Mail, HelpCircle } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Inquiries & CRM | BenzWell Admin',
};

export default async function AdminContactPage() {
  const res = await getContactMessagesAction('all');
  const messages = res.success && res.messages ? res.messages : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-sky-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Contact Messages & CRM</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage inbound customer inquiries, order assistance questions, and send email replies directly from{' '}
            <strong className="text-white">info@benzwell.in</strong>.
          </p>
        </div>
      </div>

      <ContactCRM initialMessages={messages as any} />
    </div>
  );
}
