import React from 'react';
import { Metadata } from 'next';
import { CustomerTicketsManager } from '@/components/account/customer-tickets';

export const metadata: Metadata = {
  title: 'My Support Tickets | BENZWELL',
  description: 'View your support inquiries, conversation threads, and staff replies.',
};

export default function AccountSupportPage() {
  return <CustomerTicketsManager />;
}
