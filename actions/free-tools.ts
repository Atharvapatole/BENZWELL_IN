'use server';

import { requireAdmin } from '@/lib/auth/admin';
import { AppwriteFreeToolsService, FreeToolRecord } from '@/lib/services/appwrite-free-tools-service';
import { VercelDeploymentService } from '@/lib/services/vercel-deployment-service';
import { CredentialService } from '@/lib/services/credential-service';
import { revalidatePath } from 'next/cache';

/**
 * Default starter tool if none exists yet
 */
const DEFAULT_AI_FLAT_TOOL: FreeToolRecord = {
  name: 'AI Flat Buying Checklist & Risk Calculator',
  slug: 'free-tool-flat-ai',
  short_description: 'Instant AI-powered risk assessment and due diligence checklist before buying a residential flat or apartment.',
  description: 'A comprehensive 7-point verification and financial feasibility analyzer tailored for Indian real estate buyers.',
  seo_title: 'AI Flat Buying Checklist | Free Due Diligence Tool',
  seo_description: 'Verify RERA compliance, carpet area calculations, hidden builder charges, and structural safety before booking your flat.',
  cta_heading: 'Need the complete legal & negotiation framework?',
  cta_description: 'Download the comprehensive Flat Buying Guide — Before You Buy with editable contract templates and checklists.',
  cta_button_text: 'Get Flat Buying Guide — Before You Buy',
  lead_capture_enabled: true,
  tool_type: 'interactive_checklist',
  deployment_method: 'built_in',
  status: 'live',
  production_url: 'https://benzwell.in/free-tools/free-tool-flat-ai',
  tool_config: {
    steps: [
      {
        id: 'rera',
        title: 'RERA & Legal Sanction Check',
        question: 'Has the builder provided the registered RERA number and approved building layout plan?',
        type: 'choice',
        options: ['Yes, fully registered on State RERA portal', 'In-process / Applied', 'No / Not sure'],
        riskWeight: 30,
      },
      {
        id: 'carpet_area',
        title: 'Usable Carpet Area vs Super Built-up',
        question: 'What is the loading percentage between super built-up and RERA carpet area?',
        type: 'choice',
        options: ['Under 25% (Standard)', '25% - 35% (High)', 'Over 35% (Extremely High Loading)'],
        riskWeight: 20,
      },
      {
        id: 'hidden_charges',
        title: 'Statutory & Hidden Charges',
        question: 'Are club charges, development fees, electrification, and legal fees included in the quoted base price?',
        type: 'choice',
        options: ['All-inclusive signed quote provided', 'Estimated verbally by sales team', 'Not discussed yet'],
        riskWeight: 25,
      },
    ],
  },
};

/**
 * List all Free Tools from Appwrite Database
 */
export async function getFreeToolsListAction() {
  await requireAdmin();

  let tools = await AppwriteFreeToolsService.listTools();

  // If no tools in database, auto-seed the default AI Flat Buying Checklist
  if (tools.length === 0) {
    try {
      await AppwriteFreeToolsService.saveTool(DEFAULT_AI_FLAT_TOOL);
      tools = await AppwriteFreeToolsService.listTools();
    } catch (seedErr) {
      console.warn('Auto-seed default tool notice:', seedErr);
      tools = [{ ...DEFAULT_AI_FLAT_TOOL, id: 'free-tool-flat-ai' }];
    }
  }

  return { success: true, tools };
}

/**
 * Get detailed tool data for editing or previewing
 */
export async function getFreeToolDetailAction(id: string) {
  await requireAdmin();

  const tool = await AppwriteFreeToolsService.getTool(id);

  if (!tool) {
    if (id === 'free-tool-flat-ai' || id === DEFAULT_AI_FLAT_TOOL.slug) {
      return { success: true, tool: DEFAULT_AI_FLAT_TOOL };
    }
    return { success: false, error: 'Free tool record not found in Appwrite database.' };
  }

  return { success: true, tool };
}

/**
 * Validate and clean unique URL slug
 */
function sanitizeSlug(slug: string): string {
  const reserved = ['admin', 'api', 'auth', 'cart', 'checkout', 'login', 'register', 'shop', 'account', 'blog'];
  let clean = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (reserved.includes(clean)) {
    clean = `tool-${clean}`;
  }
  return clean || `tool-${Date.now().toString(36)}`;
}

/**
 * Create or update a Free Tool record in Appwrite Database
 */
export async function saveFreeToolAction(formData: Record<string, any>) {
  await requireAdmin();

  const slug = sanitizeSlug(formData.slug || formData.name);

  const payload: Partial<FreeToolRecord> & { slug: string; name: string } = {
    id: formData.id,
    name: formData.name,
    slug,
    short_description: formData.short_description || '',
    description: formData.description || '',
    seo_title: formData.seo_title || formData.name,
    seo_description: formData.seo_description || formData.short_description || '',
    product_id: formData.product_id || '',
    cta_heading: formData.cta_heading || '',
    cta_description: formData.cta_description || '',
    cta_button_text: formData.cta_button_text || 'Get the Complete Guide',
    coupon_code: formData.coupon_code ? formData.coupon_code.toUpperCase().trim() : '',
    lead_capture_enabled: formData.lead_capture_enabled ?? true,
    tool_type: formData.tool_type || 'interactive_checklist',
    deployment_method: formData.deployment_method || 'built_in',
    status: formData.status || 'draft',
    custom_domain: formData.custom_domain || '',
    github_repo: formData.github_repo || '',
    github_branch: formData.github_branch || 'main',
    root_directory: formData.root_directory || '/',
    build_command: formData.build_command || 'npm run build',
    install_command: formData.install_command || 'npm install',
    tool_config: formData.tool_config || {},
  };

  const saveRes = await AppwriteFreeToolsService.saveTool(payload);

  if (!saveRes.success) {
    return { success: false, error: saveRes.error || 'Failed to save tool to Appwrite' };
  }

  revalidatePath('/admin/free-tools');
  revalidatePath(`/free-tools/${slug}`);
  revalidatePath(`/${slug}`);

  return { success: true, toolId: saveRes.id, slug };
}

/**
 * Toggle Status of Free Tool (draft / live / disabled)
 */
export async function toggleFreeToolStatusAction(id: string, status: 'draft' | 'live' | 'disabled') {
  await requireAdmin();

  const tool = await AppwriteFreeToolsService.getTool(id);
  if (!tool) return { success: false, error: 'Tool not found' };

  const res = await AppwriteFreeToolsService.saveTool({
    ...tool,
    id: tool.id || id,
    status,
  });

  if (!res.success) return { success: false, error: res.error };

  revalidatePath('/admin/free-tools');
  return { success: true };
}

/**
 * Delete a Free Tool
 */
export async function deleteFreeToolAction(id: string) {
  await requireAdmin();

  const res = await AppwriteFreeToolsService.deleteTool(id);
  if (!res.success) return { success: false, error: res.error };

  revalidatePath('/admin/free-tools');
  return { success: true };
}

/**
 * Validate uploaded ZIP or folder project archive for Next.js structure
 */
export async function validateZipProjectAction(base64Zip: string) {
  await requireAdmin();
  try {
    const buffer = Buffer.from(base64Zip, 'base64');
    const result = await VercelDeploymentService.validateZipArchive(buffer);
    return { success: true, ...result };
  } catch (err: any) {
    return {
      success: false,
      valid: false,
      filesCount: 0,
      hasPackageJson: false,
      hasNextConfig: false,
      error: err.message || 'Invalid ZIP buffer',
    };
  }
}

/**
 * Deploy Free Tool via Vercel (ZIP upload or GitHub repository)
 */
export async function deployFreeToolAction(
  toolId: string,
  method: 'built_in' | 'zip' | 'github',
  payload?: {
    zipBase64?: string;
    repo?: string;
    branch?: string;
    envVars?: Record<string, string>;
  }
) {
  await requireAdmin();

  const tool = await AppwriteFreeToolsService.getTool(toolId);
  if (!tool) {
    return { success: false, error: 'Free tool record not found in Appwrite database.' };
  }

  // Method 1: Built-in tool
  if (method === 'built_in') {
    await AppwriteFreeToolsService.saveTool({
      ...tool,
      id: tool.id || toolId,
      status: 'live',
      deployment_method: 'built_in',
      production_url: `https://benzwell.in/free-tools/${tool.slug}`,
      last_deployed_at: new Date().toISOString(),
    });

    revalidatePath('/admin/free-tools');
    revalidatePath(`/free-tools/${tool.slug}`);
    return {
      success: true,
      status: 'ready',
      productionUrl: `https://benzwell.in/free-tools/${tool.slug}`,
    };
  }

  // Mark status as deploying
  await AppwriteFreeToolsService.saveTool({
    ...tool,
    id: tool.id || toolId,
    status: 'deploying',
  });

  // Method 2: ZIP / Folder upload
  if (method === 'zip') {
    if (!payload?.zipBase64) {
      return { success: false, error: 'No project archive data provided for upload.' };
    }

    const zipBuffer = Buffer.from(payload.zipBase64, 'base64');
    const deployResult = await VercelDeploymentService.deployZipProject({
      projectName: `benzwell-${tool.slug}`,
      zipBuffer,
      envVars: payload.envVars,
    });

    if (!deployResult.success) {
      await AppwriteFreeToolsService.saveTool({
        ...tool,
        id: tool.id || toolId,
        status: 'draft',
      });
      return { success: false, error: deployResult.error };
    }

    await AppwriteFreeToolsService.saveTool({
      ...tool,
      id: tool.id || toolId,
      status: 'live',
      deployment_method: 'zip',
      vercel_deployment_id: deployResult.deploymentId,
      deployment_url: deployResult.deploymentUrl,
      production_url: deployResult.productionUrl || `https://benzwell.in/free-tools/${tool.slug}`,
      last_deployed_at: new Date().toISOString(),
    });

    revalidatePath('/admin/free-tools');
    return {
      success: true,
      deploymentId: deployResult.deploymentId,
      deploymentUrl: deployResult.deploymentUrl,
      productionUrl: deployResult.productionUrl,
    };
  }

  // Method 3: GitHub repository deployment
  if (method === 'github') {
    const repo = payload?.repo || tool.github_repo;
    const branch = payload?.branch || tool.github_branch || 'main';

    if (!repo) {
      return { success: false, error: 'No GitHub repository specified.' };
    }

    const deployResult = await VercelDeploymentService.deployFromGitHub({
      projectName: `benzwell-${tool.slug}`,
      repo,
      branch,
      envVars: payload?.envVars,
    });

    if (!deployResult.success) {
      await AppwriteFreeToolsService.saveTool({
        ...tool,
        id: tool.id || toolId,
        status: 'draft',
      });
      return { success: false, error: deployResult.error };
    }

    await AppwriteFreeToolsService.saveTool({
      ...tool,
      id: tool.id || toolId,
      status: 'live',
      deployment_method: 'github',
      github_repo: repo,
      github_branch: branch,
      vercel_deployment_id: deployResult.deploymentId,
      deployment_url: deployResult.deploymentUrl,
      production_url: deployResult.productionUrl || `https://benzwell.in/free-tools/${tool.slug}`,
      last_deployed_at: new Date().toISOString(),
    });

    revalidatePath('/admin/free-tools');
    return {
      success: true,
      deploymentId: deployResult.deploymentId,
      deploymentUrl: deployResult.deploymentUrl,
      productionUrl: deployResult.productionUrl,
    };
  }

  return { success: false, error: 'Unsupported deployment method' };
}

/**
 * Fetch GitHub repos for currently configured account
 */
export async function fetchGitHubReposAction() {
  await requireAdmin();
  const token = await CredentialService.getCredentialServerOnly('github', 'personal_access_token');

  if (!token) {
    return {
      success: false,
      error: 'GitHub Personal Access Token is not configured. Configure in Admin → Settings → Infrastructure → GitHub.',
      repos: [],
    };
  }

  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'BenzWell-Platform/1.0',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `GitHub error ${res.status}`, repos: [] };
    }

    const repos = await res.json();
    return {
      success: true,
      repos: (repos || []).map((r: any) => ({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        defaultBranch: r.default_branch || 'main',
        isPrivate: r.private,
        updatedAt: r.updated_at,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message, repos: [] };
  }
}

/**
 * Fetch GitHub branches for a repository
 */
export async function fetchGitHubBranchesAction(ownerRepo: string) {
  await requireAdmin();
  const token = await CredentialService.getCredentialServerOnly('github', 'personal_access_token');

  if (!token) return { success: false, branches: ['main'] };

  try {
    const res = await fetch(`https://api.github.com/repos/${ownerRepo}/branches`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'BenzWell-Platform/1.0',
      },
    });

    if (!res.ok) return { success: false, branches: ['main'] };
    const branches = await res.json();
    return {
      success: true,
      branches: (branches || []).map((b: any) => b.name),
    };
  } catch {
    return { success: false, branches: ['main'] };
  }
}

/**
 * Analytics for Free Tools
 */
export async function getFreeToolAnalyticsAction(toolId?: string, range = 'all') {
  await requireAdmin();

  return {
    success: true,
    metrics: {
      views: 0,
      starts: 0,
      completions: 0,
      leadCaptures: 0,
      ctaViews: 0,
      ctaClicks: 0,
      purchasesAttributed: 0,
      toolStartRate: 0,
      completionRate: 0,
      leadConversionRate: 0,
      ctaClickRate: 0,
    },
    leads: [],
  };
}

/**
 * Get deployment logs / history for a tool
 */
export async function getFreeToolDeploymentsAction(toolId: string) {
  await requireAdmin();
  const tool = await AppwriteFreeToolsService.getTool(toolId);

  const deployments = [];
  if (tool?.deployment_url || tool?.vercel_deployment_id) {
    deployments.push({
      id: tool.vercel_deployment_id || 'dep-1',
      tool_id: toolId,
      status: tool.status === 'live' ? 'ready' : tool.status,
      source_type: tool.deployment_method || 'built_in',
      deployment_url: tool.deployment_url || tool.production_url,
      created_at: tool.last_deployed_at || tool.updated_at || new Date().toISOString(),
      logs: `Deployment active via ${tool.deployment_method || 'built-in engine'}.`,
    });
  }

  return { success: true, deployments };
}
