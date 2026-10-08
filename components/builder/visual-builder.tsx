'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Page, PageBlock, BlockType } from '@/types';
import { savePageAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlockRenderer } from '@/components/builder/block-renderer';
import {
  Plus,
  Trash2,
  Save,
  Eye,
  Layers,
  Heading,
  Type,
  Image as ImageIcon,
  Square,
  Sparkles,
  HelpCircle,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Settings2,
  CheckCircle2,
} from 'lucide-react';

interface VisualBuilderProps {
  initialPage: Page;
}

export function VisualBuilder({ initialPage }: VisualBuilderProps) {
  const router = useRouter();
  const [page, setPage] = useState<Page>(initialPage);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'elements' | 'tree' | 'properties'>('elements');
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const sections = page.content_json?.sections || [];

  const handleAddBlock = (type: BlockType) => {
    const newId = `block_${Date.now()}`;
    let newBlock: PageBlock;

    switch (type) {
      case 'hero':
        newBlock = {
          id: newId,
          type: 'hero',
          props: {
            badge: 'New Release',
            headline: 'Digital Products Built for Better Work.',
            subheadline: 'Actionable playbooks and blueprints to help you execute faster.',
            ctaText: 'Explore Catalog',
            ctaLink: '/shop',
            secondaryCtaText: 'Browse Categories',
            secondaryCtaLink: '/shop#categories',
          },
        };
        break;

      case 'product_grid':
        newBlock = {
          id: newId,
          type: 'product_grid',
          props: {
            title: 'Featured Digital Products',
            subtitle: 'Best selling resources hand-crafted for high performers.',
            limit: 8,
          },
        };
        break;

      case 'category_grid':
        newBlock = {
          id: newId,
          type: 'category_grid',
          props: {
            title: 'Explore Collections',
            subtitle: 'Curated resources by topic and medium.',
          },
        };
        break;

      case 'testimonials':
        newBlock = {
          id: newId,
          type: 'testimonials',
          props: {
            title: 'Trusted by High-Performing Creators',
            subtitle: 'Real reviews from verified purchasers.',
          },
        };
        break;

      case 'faq':
        newBlock = {
          id: newId,
          type: 'faq',
          props: {
            title: 'Frequently Asked Questions',
          },
        };
        break;

      case 'blog_grid':
        newBlock = {
          id: newId,
          type: 'blog_grid',
          props: {
            title: 'Editorial & Guides',
            subtitle: 'Latest insights from the BenzWell Journal.',
            limit: 3,
          },
        };
        break;

      case 'heading':
        newBlock = {
          id: newId,
          type: 'heading',
          props: { level: 'h2', text: 'Section Heading Title' },
          styles: { align: 'center' },
        };
        break;

      case 'paragraph':
        newBlock = {
          id: newId,
          type: 'paragraph',
          props: { text: 'Enter your custom paragraph text here. Describe your product features or offer details.' },
          styles: { align: 'center' },
        };
        break;

      case 'button':
        newBlock = {
          id: newId,
          type: 'button',
          props: { text: 'Click Here', link: '/shop', variant: 'primary' },
          styles: { align: 'center' },
        };
        break;

      case 'spacer':
        newBlock = {
          id: newId,
          type: 'spacer',
          props: { height: '48px' },
        };
        break;

      case 'divider':
        newBlock = {
          id: newId,
          type: 'divider',
          props: {},
        };
        break;

      default:
        newBlock = {
          id: newId,
          type,
          props: {},
        };
    }

    const updatedSections = [...sections, newBlock];
    setPage({
      ...page,
      content_json: { sections: updatedSections },
    });
    setSelectedBlockId(newId);
    setActiveTab('properties');
  };

  const handleRemoveBlock = (blockId: string) => {
    const updated = sections.filter((b) => b.id !== blockId);
    setPage({
      ...page,
      content_json: { sections: updated },
    });
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setPage({
      ...page,
      content_json: { sections: updated },
    });
  };

  const handleSavePage = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const res = await savePageAction(page);
    setIsSaving(false);

    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert(res.error || 'Failed to save page');
    }
  };

  const selectedBlock = sections.find((b) => b.id === selectedBlockId);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -m-6 sm:-m-8 lg:-m-10 bg-zinc-950 text-white overflow-hidden">
      {/* Top Builder Toolbar */}
      <div className="h-16 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-extrabold text-sm text-white">{page.title}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            /{page.slug}
          </span>
          <select
            value={page.status}
            onChange={(e) => setPage({ ...page, status: e.target.value as any })}
            className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800 text-xs font-bold text-sky-400 focus:outline-none capitalize"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </span>
          )}

          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              isPreview
                ? 'bg-sky-500 text-zinc-950 border-sky-500'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreview ? 'Exit Preview' : 'Live Canvas Preview'}</span>
          </button>

          <Button
            size="sm"
            onClick={handleSavePage}
            isLoading={isSaving}
            className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            <span>Save & Publish</span>
          </Button>
        </div>
      </div>

      {/* Main Canvas & Tool Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Element Tray (Unless preview mode) */}
        {!isPreview && (
          <div className="w-72 border-r border-zinc-800 bg-zinc-900/60 p-4 overflow-y-auto flex flex-col space-y-6 flex-shrink-0">
            {/* Tabs */}
            <div className="flex rounded-xl bg-zinc-800 p-1">
              <button
                onClick={() => setActiveTab('elements')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'elements' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Blocks
              </button>
              <button
                onClick={() => setActiveTab('tree')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'tree' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Outline ({sections.length})
              </button>
            </div>

            {activeTab === 'elements' && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Ecommerce & Sections
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddBlock('hero')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all group"
                  >
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <p className="text-xs font-bold text-white">Hero Header</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('product_grid')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all group"
                  >
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-bold text-white">Product Grid</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('category_grid')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all group"
                  >
                    <Square className="w-4 h-4 text-purple-400" />
                    <p className="text-xs font-bold text-white">Categories</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('testimonials')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all group"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <p className="text-xs font-bold text-white">Testimonials</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('faq')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all group"
                  >
                    <HelpCircle className="w-4 h-4 text-sky-400" />
                    <p className="text-xs font-bold text-white">FAQ Accordion</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('blog_grid')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all group"
                  >
                    <BookOpen className="w-4 h-4 text-rose-400" />
                    <p className="text-xs font-bold text-white">Blog Feed</p>
                  </button>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block pt-2">
                  Typography & Layout
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddBlock('heading')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all"
                  >
                    <Heading className="w-4 h-4 text-zinc-300" />
                    <p className="text-xs font-bold text-white">Heading</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('paragraph')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all"
                  >
                    <Type className="w-4 h-4 text-zinc-300" />
                    <p className="text-xs font-bold text-white">Paragraph</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('button')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all"
                  >
                    <Square className="w-4 h-4 text-zinc-300" />
                    <p className="text-xs font-bold text-white">Button CTA</p>
                  </button>

                  <button
                    onClick={() => handleAddBlock('spacer')}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-left space-y-1 transition-all"
                  >
                    <Layers className="w-4 h-4 text-zinc-300" />
                    <p className="text-xs font-bold text-white">Spacer</p>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tree' && (
              <div className="space-y-2">
                {sections.map((b, idx) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBlockId(b.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      selectedBlockId === b.id
                        ? 'bg-zinc-800 border-sky-500 text-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="capitalize">{b.type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveBlock(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-1 hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveBlock(idx, 'down');
                        }}
                        disabled={idx === sections.length - 1}
                        className="p-1 hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveBlock(b.id);
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Center: Live Canvas */}
        <div className="flex-1 bg-zinc-900 overflow-y-auto p-6 sm:p-10">
          <div className="max-w-6xl mx-auto rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl min-h-[600px] p-6 sm:p-12 space-y-12">
            {sections.length > 0 ? (
              sections.map((sectionBlock, idx) => (
                <div
                  key={sectionBlock.id}
                  onClick={() => !isPreview && setSelectedBlockId(sectionBlock.id)}
                  className={`relative group rounded-2xl transition-all ${
                    !isPreview
                      ? `p-4 border border-dashed ${
                          selectedBlockId === sectionBlock.id
                            ? 'border-sky-500 bg-sky-950/10'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`
                      : ''
                  }`}
                >
                  {!isPreview && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 flex items-center gap-1 text-[11px] text-zinc-400 z-20">
                      <span className="font-semibold capitalize">{sectionBlock.type}</span>
                      <button
                        onClick={() => handleRemoveBlock(sectionBlock.id)}
                        className="p-1 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <BlockRenderer block={sectionBlock} />
                </div>
              ))
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <Layers className="w-12 h-12 text-zinc-700" />
                <h4 className="font-bold text-lg text-white">Empty Canvas</h4>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Click any block in the left sidebar to add heroes, product grids, testimonials, or typography sections.
                </p>
                <Button size="sm" onClick={() => handleAddBlock('hero')} className="mt-2">
                  + Add Hero Section
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Properties Panel (When block selected) */}
        {!isPreview && selectedBlock && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900/60 p-6 overflow-y-auto space-y-6 flex-shrink-0">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-sky-400" />
                <span>{selectedBlock.type} Properties</span>
              </h3>
              <button
                onClick={() => setSelectedBlockId(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Dynamic Field Inputs based on block type */}
            <div className="space-y-4">
              {selectedBlock.type === 'hero' && (
                <>
                  <Input
                    label="Badge"
                    value={selectedBlock.props.badge || ''}
                    onChange={(e) => {
                      const updated = sections.map((b) =>
                        b.id === selectedBlock.id
                          ? { ...b, props: { ...b.props, badge: e.target.value } }
                          : b
                      );
                      setPage({ ...page, content_json: { sections: updated } });
                    }}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Headline</label>
                    <textarea
                      rows={2}
                      value={selectedBlock.props.headline || ''}
                      onChange={(e) => {
                        const updated = sections.map((b) =>
                          b.id === selectedBlock.id
                            ? { ...b, props: { ...b.props, headline: e.target.value } }
                            : b
                        );
                        setPage({ ...page, content_json: { sections: updated } });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <Input
                    label="Primary CTA Text"
                    value={selectedBlock.props.ctaText || ''}
                    onChange={(e) => {
                      const updated = sections.map((b) =>
                        b.id === selectedBlock.id
                          ? { ...b, props: { ...b.props, ctaText: e.target.value } }
                          : b
                      );
                      setPage({ ...page, content_json: { sections: updated } });
                    }}
                  />
                </>
              )}

              {selectedBlock.type === 'heading' && (
                <Input
                  label="Heading Text"
                  value={selectedBlock.props.text || ''}
                  onChange={(e) => {
                    const updated = sections.map((b) =>
                      b.id === selectedBlock.id
                        ? { ...b, props: { ...b.props, text: e.target.value } }
                        : b
                    );
                    setPage({ ...page, content_json: { sections: updated } });
                  }}
                />
              )}

              {selectedBlock.type === 'paragraph' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Paragraph Content</label>
                  <textarea
                    rows={4}
                    value={selectedBlock.props.text || ''}
                    onChange={(e) => {
                      const updated = sections.map((b) =>
                        b.id === selectedBlock.id
                          ? { ...b, props: { ...b.props, text: e.target.value } }
                          : b
                      );
                      setPage({ ...page, content_json: { sections: updated } });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              {selectedBlock.type === 'product_grid' && (
                <Input
                  label="Grid Title"
                  value={selectedBlock.props.title || ''}
                  onChange={(e) => {
                    const updated = sections.map((b) =>
                      b.id === selectedBlock.id
                        ? { ...b, props: { ...b.props, title: e.target.value } }
                        : b
                    );
                    setPage({ ...page, content_json: { sections: updated } });
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
