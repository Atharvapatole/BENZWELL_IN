'use client';

import React, { useState } from 'react';
import { ProductCategory } from '@/types';
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/utils';
import { Plus, Edit, Trash2, Layers, AlertCircle, Check } from 'lucide-react';

export function CategoriesManager({ initialCategories }: { initialCategories: ProductCategory[] }) {
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setSortOrder('0');
    setIsActive(true);
    setError(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingId) {
      setSlug(slugify(val));
    }
  };

  const handleEditClick = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setSortOrder(cat.sort_order.toString());
    setIsActive(cat.is_active);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      name,
      slug,
      description: description || null,
      sort_order: parseInt(sortOrder) || 0,
      is_active: isActive,
    };

    let res;
    if (editingId) {
      res = await updateCategoryAction(editingId, payload);
    } else {
      res = await createCategoryAction(payload);
    }

    setIsLoading(false);
    if (!res.success) {
      setError(res.error || 'Operation failed');
      return;
    }

    if (editingId && res.category) {
      setCategories(categories.map((c) => (c.id === editingId ? res.category! : c)));
    } else if (res.category) {
      setCategories([...categories, res.category]);
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    const res = await deleteCategoryAction(id);
    if (res.success) {
      setCategories(categories.filter((c) => c.id !== id));
    } else {
      alert(res.error || 'Failed to delete category');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Category Creation / Edit Form (5 cols) */}
      <div className="lg:col-span-5 p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>{editingId ? 'Edit Category' : 'Create New Category'}</span>
        </h3>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. AI & Prompts"
          />

          <Input
            label="Category Slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. ai-prompts"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what products belong in this category."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-[#0e1017] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sort Order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="cat-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#0e1017] text-sky-500"
              />
              <label htmlFor="cat-active" className="text-xs font-semibold text-zinc-200">
                Active in Store
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="md"
              className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 font-bold shadow-md"
              isLoading={isLoading}
            >
              {editingId ? 'Save Category' : '+ Create Category'}
            </Button>
            {editingId && (
              <Button type="button" size="md" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Category List Table (7 cols) */}
      <div className="lg:col-span-7 p-6 rounded-3xl bg-[#161822]/90 border border-zinc-700/80 shadow-glass space-y-4">
        <h3 className="text-base font-bold text-white">Categories ({categories.length})</h3>

        {categories.length > 0 ? (
          <div className="divide-y divide-zinc-800/80">
            {categories.map((cat) => (
              <div key={cat.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white">{cat.name}</h4>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                      /{cat.slug}
                    </span>
                    {!cat.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Hidden
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-xs text-zinc-300 mt-1 line-clamp-1">{cat.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditClick(cat)}
                    className="p-2 text-zinc-300 hover:text-sky-300 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-zinc-300 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 py-6 text-center">No categories found.</p>
        )}
      </div>
    </div>
  );
}
