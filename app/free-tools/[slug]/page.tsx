import React from 'react';
import { notFound } from 'next/navigation';
import { AppwriteFreeToolsService } from '@/lib/services/appwrite-free-tools-service';
import { ToolInteractiveEngine } from '@/components/free-tools/tool-interactive-engine';
import { Metadata } from 'next';

interface FreeToolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: FreeToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = await AppwriteFreeToolsService.getTool(slug);

  if (!tool) {
    return { title: 'Free Tool — BenzWell' };
  }

  return {
    title: tool.seo_title || `${tool.name} — Free Tool | BenzWell`,
    description: tool.seo_description || tool.short_description || 'Use BenzWell interactive free tools for smart due diligence.',
  };
}

export default async function FreeToolPublicPage({ params }: FreeToolPageProps) {
  const { slug } = await params;
  const tool = await AppwriteFreeToolsService.getTool(slug);

  if (!tool) {
    notFound();
  }

  // If disabled
  if (tool.status === 'disabled') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Tool Currently Unavailable</h1>
          <p className="text-zinc-400 text-sm">This free tool is currently offline for maintenance. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0b10] text-zinc-100 flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center">
        <ToolInteractiveEngine
          tool={{
            id: tool.id || tool.$id || slug,
            name: tool.name,
            slug: tool.slug,
            description: tool.description,
            short_description: tool.short_description,
            tool_type: tool.tool_type || 'interactive_checklist',
            lead_capture_enabled: tool.lead_capture_enabled ?? true,
            cta_heading: tool.cta_heading,
            cta_description: tool.cta_description,
            cta_button_text: tool.cta_button_text || 'Get the Complete Guide',
            coupon_code: tool.coupon_code,
            product: tool.product,
            tool_config: tool.tool_config,
          }}
        />
      </div>
    </main>
  );
}
