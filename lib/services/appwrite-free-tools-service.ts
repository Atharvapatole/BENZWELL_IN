import { getAppwriteServerClient } from '@/lib/appwrite/server';
import { ID, Query, Permission, Role } from 'node-appwrite';
import { createAdminClient } from '@/lib/supabase/admin';

export interface FreeToolRecord {
  $id?: string;
  id?: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  product_id?: string;
  product?: any;
  cta_heading?: string;
  cta_description?: string;
  cta_button_text?: string;
  coupon_code?: string;
  lead_capture_enabled?: boolean;
  tool_type?: string;
  deployment_method?: 'built_in' | 'zip' | 'github';
  status: 'draft' | 'live' | 'deploying' | 'disabled';
  custom_domain?: string;
  github_repo?: string;
  github_branch?: string;
  root_directory?: string;
  build_command?: string;
  install_command?: string;
  tool_config?: any;
  vercel_deployment_id?: string;
  deployment_url?: string;
  production_url?: string;
  last_deployed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FreeToolLead {
  id?: string;
  tool_id: string;
  email: string;
  name?: string;
  phone?: string;
  answers?: any;
  created_at?: string;
}

// In-memory runtime cache for resilience
const inMemoryToolsCache = new Map<string, FreeToolRecord>();
let knownAttributesCache: Set<string> | null = null;
let lastAttributeCheckTime = 0;

export class AppwriteFreeToolsService {
  private static COLLECTION_NAME = 'free_tools';
  private static LEADS_COLLECTION = 'free_tool_leads';
  private static EVENTS_COLLECTION = 'free_tool_events';
  private static DEPLOYMENTS_COLLECTION = 'free_tool_deployments';

  /**
   * Helper to format scope errors and Appwrite exceptions clearly
   */
  private static formatAppwriteError(err: any): string {
    const msg = err?.message || '';
    if (msg.includes('missing scopes') || msg.includes('documents.write')) {
      return `Appwrite API Key is missing the 'documents.write' scope. Please open your Appwrite Console → Project Settings → API Keys → Edit your BenzWell Server Key and enable 'documents.write', 'documents.read', 'databases.read', 'databases.write' scopes.`;
    }
    if (msg.includes('collections.write') || msg.includes('collections.create')) {
      return `Appwrite API Key is missing the 'collections.write' scope to create collection '${this.COLLECTION_NAME}'. Please create the collection '${this.COLLECTION_NAME}' in your Appwrite Database or enable 'collections.write' on your API Key.`;
    }
    return msg || 'Appwrite Database operation failed.';
  }

  /**
   * Ensure collection and its schema attributes exist in Appwrite Database
   */
  private static async ensureCollectionAndAttributes(databaseId: string, databases: any): Promise<Set<string>> {
    const now = Date.now();
    // Cache attributes for 30 seconds
    if (knownAttributesCache && now - lastAttributeCheckTime < 30000) {
      return knownAttributesCache;
    }

    const collectionId = this.COLLECTION_NAME;
    let collectionExists = false;

    try {
      await databases.getCollection(databaseId, collectionId);
      collectionExists = true;
    } catch {
      try {
        await databases.createCollection(
          databaseId,
          collectionId,
          'Free Tools',
          [Permission.read(Role.any()), Permission.write(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())]
        );
        collectionExists = true;
      } catch (createErr: any) {
        console.warn('Could not auto-create collection:', createErr?.message);
      }
    }

    if (!collectionExists) {
      return new Set();
    }

    // Inspect existing attributes
    const existingAttrSet = new Set<string>();
    try {
      const attrRes = await databases.listAttributes(databaseId, collectionId);
      for (const a of attrRes.attributes || []) {
        if (a.key && a.status === 'available') {
          existingAttrSet.add(a.key);
        } else if (a.key) {
          // If in processing, still track
          existingAttrSet.add(a.key);
        }
      }
    } catch (listErr: any) {
      console.warn('Could not list Appwrite collection attributes:', listErr?.message);
    }

    // Attempt to create any missing required schema attributes if API key has schema permissions
    const desiredAttributes: Array<{ key: string; type: 'string' | 'boolean'; size?: number; defaultVal?: any }> = [
      { key: 'name', type: 'string', size: 255 },
      { key: 'slug', type: 'string', size: 255 },
      { key: 'short_description', type: 'string', size: 1000 },
      { key: 'description', type: 'string', size: 5000 },
      { key: 'seo_title', type: 'string', size: 255 },
      { key: 'seo_description', type: 'string', size: 1000 },
      { key: 'product_id', type: 'string', size: 255 },
      { key: 'cta_heading', type: 'string', size: 255 },
      { key: 'cta_description', type: 'string', size: 1000 },
      { key: 'cta_button_text', type: 'string', size: 255 },
      { key: 'coupon_code', type: 'string', size: 50 },
      { key: 'lead_capture_enabled', type: 'boolean', defaultVal: true },
      { key: 'tool_type', type: 'string', size: 100 },
      { key: 'deployment_method', type: 'string', size: 100 },
      { key: 'status', type: 'string', size: 50 },
      { key: 'custom_domain', type: 'string', size: 255 },
      { key: 'github_repo', type: 'string', size: 255 },
      { key: 'github_branch', type: 'string', size: 100 },
      { key: 'root_directory', type: 'string', size: 255 },
      { key: 'build_command', type: 'string', size: 255 },
      { key: 'install_command', type: 'string', size: 255 },
      { key: 'tool_config', type: 'string', size: 65535 },
      { key: 'vercel_deployment_id', type: 'string', size: 255 },
      { key: 'deployment_url', type: 'string', size: 1000 },
      { key: 'production_url', type: 'string', size: 1000 },
      { key: 'last_deployed_at', type: 'string', size: 100 },
    ];

    for (const attr of desiredAttributes) {
      if (!existingAttrSet.has(attr.key)) {
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size || 255, false);
          } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(databaseId, collectionId, attr.key, false, attr.defaultVal);
          }
          existingAttrSet.add(attr.key);
        } catch {
          // Attribute creation may fail if API key lacks collections.write or if attribute is already creating
        }
      }
    }

    knownAttributesCache = existingAttrSet;
    lastAttributeCheckTime = now;
    return existingAttrSet;
  }

  /**
   * Build adaptive payload that only sends attributes accepted by the collection schema,
   * with automatic alias matching (name <-> toolName <-> title <-> tool_name).
   */
  private static adaptPayloadForAppwrite(data: Partial<FreeToolRecord>, availableAttributes: Set<string>): Record<string, any> {
    const raw: Record<string, any> = {
      name: data.name,
      slug: data.slug,
      short_description: data.short_description || '',
      description: data.description || '',
      seo_title: data.seo_title || data.name,
      seo_description: data.seo_description || data.short_description || '',
      product_id: data.product_id || '',
      cta_heading: data.cta_heading || '',
      cta_description: data.cta_description || '',
      cta_button_text: data.cta_button_text || 'Get the Complete Guide',
      coupon_code: data.coupon_code || '',
      lead_capture_enabled: data.lead_capture_enabled ?? true,
      tool_type: data.tool_type || 'interactive_checklist',
      deployment_method: data.deployment_method || 'built_in',
      status: data.status || 'draft',
      custom_domain: data.custom_domain || '',
      github_repo: data.github_repo || '',
      github_branch: data.github_branch || 'main',
      root_directory: data.root_directory || '/',
      build_command: data.build_command || 'npm run build',
      install_command: data.install_command || 'npm install',
      tool_config: typeof data.tool_config === 'object' ? JSON.stringify(data.tool_config) : (data.tool_config || '{}'),
      vercel_deployment_id: data.vercel_deployment_id || '',
      deployment_url: data.deployment_url || '',
      production_url: data.production_url || '',
      last_deployed_at: data.last_deployed_at || '',
    };

    // If availableAttributes is empty (attributes could not be queried), send raw payload
    if (!availableAttributes || availableAttributes.size === 0) {
      return raw;
    }

    const payload: Record<string, any> = {};

    // 1. Handle primary name field with alias fallback
    if (availableAttributes.has('name')) {
      payload.name = raw.name;
    } else if (availableAttributes.has('toolName')) {
      payload.toolName = raw.name;
    } else if (availableAttributes.has('title')) {
      payload.title = raw.name;
    } else if (availableAttributes.has('tool_name')) {
      payload.tool_name = raw.name;
    }

    // 2. Map other fields with snake_case and camelCase support
    const aliasMap: Record<string, string[]> = {
      slug: ['slug'],
      short_description: ['short_description', 'shortDescription', 'summary'],
      description: ['description', 'details'],
      seo_title: ['seo_title', 'seoTitle'],
      seo_description: ['seo_description', 'seoDescription'],
      product_id: ['product_id', 'productId'],
      cta_heading: ['cta_heading', 'ctaHeading'],
      cta_description: ['cta_description', 'ctaDescription'],
      cta_button_text: ['cta_button_text', 'ctaButtonText'],
      coupon_code: ['coupon_code', 'couponCode'],
      lead_capture_enabled: ['lead_capture_enabled', 'leadCaptureEnabled'],
      tool_type: ['tool_type', 'toolType'],
      deployment_method: ['deployment_method', 'deploymentMethod'],
      status: ['status'],
      custom_domain: ['custom_domain', 'customDomain'],
      github_repo: ['github_repo', 'githubRepo'],
      github_branch: ['github_branch', 'githubBranch'],
      root_directory: ['root_directory', 'rootDirectory'],
      build_command: ['build_command', 'buildCommand'],
      install_command: ['install_command', 'installCommand'],
      tool_config: ['tool_config', 'toolConfig', 'config'],
      vercel_deployment_id: ['vercel_deployment_id', 'vercelDeploymentId'],
      deployment_url: ['deployment_url', 'deploymentUrl'],
      production_url: ['production_url', 'productionUrl'],
      last_deployed_at: ['last_deployed_at', 'lastDeployedAt'],
    };

    for (const [key, aliases] of Object.entries(aliasMap)) {
      if (raw[key] !== undefined) {
        for (const alias of aliases) {
          if (availableAttributes.has(alias)) {
            payload[alias] = raw[key];
            break;
          }
        }
      }
    }

    return payload;
  }

  /**
   * Normalize an Appwrite document (or DB object) to standard FreeToolRecord
   */
  private static normalizeDoc(doc: any): FreeToolRecord {
    let toolConfig = {};
    const rawConfig = doc.tool_config || doc.toolConfig || doc.config;
    if (typeof rawConfig === 'string') {
      try {
        toolConfig = JSON.parse(rawConfig);
      } catch {
        toolConfig = {};
      }
    } else if (typeof rawConfig === 'object' && rawConfig !== null) {
      toolConfig = rawConfig;
    }

    return {
      id: doc.$id || doc.id,
      $id: doc.$id || doc.id,
      name: doc.name || doc.toolName || doc.title || doc.tool_name || 'Untitled Free Tool',
      slug: doc.slug || doc.$id || 'tool',
      short_description: doc.short_description || doc.shortDescription || '',
      description: doc.description || doc.details || '',
      seo_title: doc.seo_title || doc.seoTitle || doc.name,
      seo_description: doc.seo_description || doc.seoDescription || '',
      product_id: doc.product_id || doc.productId || '',
      cta_heading: doc.cta_heading || doc.ctaHeading || '',
      cta_description: doc.cta_description || doc.ctaDescription || '',
      cta_button_text: doc.cta_button_text || doc.ctaButtonText || 'Get the Complete Guide',
      coupon_code: doc.coupon_code || doc.couponCode || '',
      lead_capture_enabled: doc.lead_capture_enabled ?? doc.leadCaptureEnabled ?? true,
      tool_type: doc.tool_type || doc.toolType || 'interactive_checklist',
      deployment_method: doc.deployment_method || doc.deploymentMethod || 'built_in',
      status: doc.status || 'draft',
      custom_domain: doc.custom_domain || doc.customDomain || '',
      github_repo: doc.github_repo || doc.githubRepo || '',
      github_branch: doc.github_branch || doc.githubBranch || 'main',
      root_directory: doc.root_directory || doc.rootDirectory || '/',
      build_command: doc.build_command || doc.buildCommand || 'npm run build',
      install_command: doc.install_command || doc.installCommand || 'npm install',
      tool_config: toolConfig,
      vercel_deployment_id: doc.vercel_deployment_id || doc.vercelDeploymentId || '',
      deployment_url: doc.deployment_url || doc.deploymentUrl || '',
      production_url: doc.production_url || doc.productionUrl || '',
      last_deployed_at: doc.last_deployed_at || doc.lastDeployedAt || '',
      created_at: doc.$createdAt || doc.created_at || new Date().toISOString(),
      updated_at: doc.$updatedAt || doc.updated_at || new Date().toISOString(),
    };
  }

  /**
   * List all Free Tools from Appwrite Database
   */
  static async listTools(): Promise<FreeToolRecord[]> {
    try {
      const { databases, databaseId } = await getAppwriteServerClient();
      const res = await databases.listDocuments(databaseId, this.COLLECTION_NAME, [
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);

      const tools = res.documents.map((doc: any) => {
        const item = this.normalizeDoc(doc);
        inMemoryToolsCache.set(item.slug, item);
        if (item.id) inMemoryToolsCache.set(item.id, item);
        return item;
      });

      return tools;
    } catch (err: any) {
      console.warn('Appwrite listTools notice:', err.message);

      // Return cached memory items
      if (inMemoryToolsCache.size > 0) {
        const uniqueList: FreeToolRecord[] = [];
        const seen = new Set<string>();
        for (const item of inMemoryToolsCache.values()) {
          if (!seen.has(item.slug)) {
            seen.add(item.slug);
            uniqueList.push(item);
          }
        }
        return uniqueList;
      }

      // Check database settings backup
      try {
        const supabase = createAdminClient();
        const { data } = await supabase.from('site_settings').select('value').eq('key', 'free_tools_backup').maybeSingle();
        if (data?.value && Array.isArray(data.value)) {
          return data.value.map((d: any) => this.normalizeDoc(d));
        }
      } catch {
        // ignore
      }

      return [];
    }
  }

  /**
   * Get single tool by ID or slug
   */
  static async getTool(idOrSlug: string): Promise<FreeToolRecord | null> {
    try {
      const { databases, databaseId } = await getAppwriteServerClient();

      // 1. Try get by ID
      try {
        const doc: any = await databases.getDocument(databaseId, this.COLLECTION_NAME, idOrSlug);
        if (doc) {
          const item = this.normalizeDoc(doc);
          inMemoryToolsCache.set(item.slug, item);
          if (item.id) inMemoryToolsCache.set(item.id, item);
          return item;
        }
      } catch {
        // Query by slug
      }

      // 2. Query by slug
      const res = await databases.listDocuments(databaseId, this.COLLECTION_NAME, [
        Query.equal('slug', idOrSlug),
        Query.limit(1),
      ]);

      if (res.documents.length > 0) {
        const item = this.normalizeDoc(res.documents[0]);
        inMemoryToolsCache.set(item.slug, item);
        if (item.id) inMemoryToolsCache.set(item.id, item);
        return item;
      }
    } catch (err: any) {
      console.warn('Appwrite getTool notice:', err.message);
    }

    // 3. Fallback: in-memory cache
    if (inMemoryToolsCache.has(idOrSlug)) {
      return inMemoryToolsCache.get(idOrSlug)!;
    }

    // 4. Fallback: site_settings backup
    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'free_tools_backup').maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        const match = data.value.find((t: any) => t.slug === idOrSlug || t.id === idOrSlug);
        if (match) return this.normalizeDoc(match);
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Save or update tool in Appwrite Database with auto-schema adaptation
   */
  static async saveTool(data: Partial<FreeToolRecord> & { id?: string; slug: string; name: string }): Promise<{
    success: boolean;
    id: string;
    error?: string;
  }> {
    let savedId = data.id || `tool_${Date.now().toString(36)}`;

    const cacheItem: FreeToolRecord = {
      id: savedId,
      $id: savedId,
      name: data.name,
      slug: data.slug,
      short_description: data.short_description || '',
      description: data.description || '',
      seo_title: data.seo_title || data.name,
      seo_description: data.seo_description || data.short_description || '',
      product_id: data.product_id || '',
      cta_heading: data.cta_heading || '',
      cta_description: data.cta_description || '',
      cta_button_text: data.cta_button_text || 'Get the Complete Guide',
      coupon_code: data.coupon_code || '',
      lead_capture_enabled: data.lead_capture_enabled ?? true,
      tool_type: data.tool_type || 'interactive_checklist',
      deployment_method: data.deployment_method || 'built_in',
      status: data.status || 'draft',
      custom_domain: data.custom_domain || '',
      github_repo: data.github_repo || '',
      github_branch: data.github_branch || 'main',
      root_directory: data.root_directory || '/',
      build_command: data.build_command || 'npm run build',
      install_command: data.install_command || 'npm install',
      tool_config: data.tool_config || {},
      vercel_deployment_id: data.vercel_deployment_id || '',
      deployment_url: data.deployment_url || '',
      production_url: data.production_url || '',
      last_deployed_at: data.last_deployed_at || '',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryToolsCache.set(data.slug, cacheItem);
    inMemoryToolsCache.set(savedId, cacheItem);

    try {
      const { databases, databaseId } = await getAppwriteServerClient();

      // Ensure collection & inspect available schema attributes
      const availableAttrs = await this.ensureCollectionAndAttributes(databaseId, databases);

      // Adapt payload so unknown attributes are never sent
      const payload = this.adaptPayloadForAppwrite(data, availableAttrs);

      if (data.id) {
        await databases.updateDocument(databaseId, this.COLLECTION_NAME, data.id, payload);
        return { success: true, id: data.id };
      } else {
        const created = await databases.createDocument(databaseId, this.COLLECTION_NAME, ID.unique(), payload);
        savedId = created.$id;
        cacheItem.id = savedId;
        cacheItem.$id = savedId;
        inMemoryToolsCache.set(savedId, cacheItem);
        return { success: true, id: savedId };
      }
    } catch (err: any) {
      const formattedError = this.formatAppwriteError(err);
      console.error('Appwrite saveTool error:', formattedError);

      // Save backup in site_settings so no tool configuration is lost
      try {
        const supabase = createAdminClient();
        const existingTools = await this.listTools();
        const updatedList = [
          ...existingTools.filter((t) => t.slug !== data.slug && t.id !== savedId),
          cacheItem,
        ];
        await supabase.from('site_settings').upsert({
          key: 'free_tools_backup',
          value: updatedList,
          category: 'free_tools',
          updated_at: new Date().toISOString(),
        });
      } catch {
        // ignore
      }

      // If missing scope, return the specific clear instruction
      if (err?.message?.includes('missing scopes') || err?.message?.includes('documents.write')) {
        return {
          success: false,
          id: savedId,
          error: formattedError,
        };
      }

      return { success: false, id: savedId, error: formattedError };
    }
  }

  /**
   * Delete tool from Appwrite
   */
  static async deleteTool(id: string): Promise<{ success: boolean; error?: string }> {
    inMemoryToolsCache.delete(id);
    try {
      const { databases, databaseId } = await getAppwriteServerClient();
      await databases.deleteDocument(databaseId, this.COLLECTION_NAME, id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.formatAppwriteError(err) };
    }
  }

  /**
   * Record a lead captured from a Free Tool
   */
  static async recordLead(lead: FreeToolLead): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { databases, databaseId } = await getAppwriteServerClient();
      const created = await databases.createDocument(
        databaseId,
        this.LEADS_COLLECTION,
        ID.unique(),
        {
          tool_id: lead.tool_id,
          email: lead.email,
          name: lead.name || '',
          phone: lead.phone || '',
          answers: typeof lead.answers === 'object' ? JSON.stringify(lead.answers) : (lead.answers || '{}'),
        }
      );

      return { success: true, id: created.$id };
    } catch (err: any) {
      return { success: false, error: this.formatAppwriteError(err) };
    }
  }

  /**
   * Record analytics event for a Free Tool
   */
  static async recordEvent(toolId: string, eventType: string, metadata?: any): Promise<void> {
    try {
      const { databases, databaseId } = await getAppwriteServerClient();
      await databases.createDocument(
        databaseId,
        this.EVENTS_COLLECTION,
        ID.unique(),
        {
          tool_id: toolId,
          event_type: eventType,
          metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '{}'),
        }
      );
    } catch {
      // Non-blocking analytics logging
    }
  }
}
