'use server';

import { requireAdmin } from '@/lib/auth/admin';
import { SupabaseMigrationService, MigrationScanReport, MigrationProgress } from '@/lib/services/supabase-migration-service';
import { SupabaseMigrationConfig } from '@/lib/services/infrastructure-config-service';
import { revalidatePath } from 'next/cache';

/**
 * Scan source Supabase project and discover tables, storage buckets, and auth users
 */
export async function scanMigrationSourceAction(override?: Partial<SupabaseMigrationConfig>): Promise<MigrationScanReport> {
  await requireAdmin();
  return SupabaseMigrationService.scanSource(override);
}

/**
 * Run full end-to-end migration (Database -> Appwrite, Public Media -> ImageKit, Paid Deliverables -> Tigris)
 */
export async function runMigrationAction(override?: Partial<SupabaseMigrationConfig>): Promise<MigrationProgress> {
  await requireAdmin();
  const res = await SupabaseMigrationService.runFullMigration(override);

  revalidatePath('/admin/settings/infrastructure');
  revalidatePath('/admin/products');
  revalidatePath('/admin/media');

  return res;
}
