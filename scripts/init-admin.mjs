import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function setupAdmin() {
  const adminEmail = 'info@benzwell.in';
  const adminPassword = 'Benzwell@26';

  console.log(`Setting up BenzWell Admin: ${adminEmail}...`);

  // 1. Check if user exists in auth.users
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing auth users:', listErr.message);
    process.exit(1);
  }

  const existingUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
  );

  let userId;

  if (existingUser) {
    console.log(`Found existing auth user: ${existingUser.id}. Updating password and confirming email...`);
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: 'BenzWell Administrator', role: 'admin' },
      }
    );
    if (updateErr) {
      console.error('Failed to update auth user:', updateErr.message);
    } else {
      userId = updated.user.id;
      console.log('Auth user password updated & email confirmed.');
    }
  } else {
    console.log('Creating new admin user in auth.users...');
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'BenzWell Administrator', role: 'admin' },
    });
    if (createErr) {
      console.error('Failed to create auth user:', createErr.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`Created auth user: ${userId}`);
  }

  // 2. Upsert profile with role 'admin'
  console.log(`Ensuring profile record has role 'admin'...`);
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: adminEmail,
        full_name: 'BenzWell Administrator',
        role: 'admin',
        is_verified: true,
        is_disabled: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (profErr) {
    console.error('Failed to update profile role:', profErr.message);
  } else {
    console.log(`SUCCESS! Profile configured:`, profile);
  }
}

setupAdmin();
