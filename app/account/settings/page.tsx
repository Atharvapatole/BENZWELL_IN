import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Settings, Shield, User, Mail, Phone, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  async function updateProfile(formData: FormData) {
    'use server';
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    const sb = await createClient();
    const {
      data: { user: currentUser },
    } = await sb.auth.getUser();

    if (!currentUser) return;

    const admin = createAdminClient();
    await admin
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id);

    revalidatePath('/account/settings');
    revalidatePath('/account');
  }

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-1">
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-500" />
          <span>Account Settings</span>
        </h1>
        <p className="text-xs text-zinc-500">
          Manage your personal details and contact information.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-glass backdrop-blur-xl space-y-6">
        <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Profile Information</h2>

        <form action={updateProfile} className="space-y-4 max-w-lg">
          <Input
            name="fullName"
            label="Full Name"
            defaultValue={profile?.full_name || ''}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/60 text-sm text-zinc-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-zinc-400">Email is linked to your order history and cannot be changed directly.</p>
          </div>

          <Input
            name="phone"
            label="Phone Number"
            type="tel"
            defaultValue={profile?.phone || ''}
            placeholder="e.g. 9876543210"
          />

          <div className="pt-2">
            <Button type="submit" size="md">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
