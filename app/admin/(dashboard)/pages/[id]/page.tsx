import React from 'react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { VisualBuilder } from '@/components/builder/visual-builder';
import { Page } from '@/types';

export const revalidate = 0;

export default async function AdminPageBuilderRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !page) {
    notFound();
  }

  return <VisualBuilder initialPage={page as any} />;
}
