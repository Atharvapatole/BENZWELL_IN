import { CredentialService } from '@/lib/services/credential-service';
import JSZip from 'jszip';

export interface VercelDeploymentResult {
  success: boolean;
  deploymentId?: string;
  deploymentUrl?: string;
  productionUrl?: string;
  status?: string;
  error?: string;
  logs?: string;
}

export class VercelDeploymentService {
  private static async getAuthHeaders(): Promise<{ token: string; teamId?: string }> {
    const token = await CredentialService.getCredentialServerOnly('vercel', 'api_token');
    const teamId = await CredentialService.getCredentialServerOnly('vercel', 'team_id');

    if (!token) {
      throw new Error('Vercel API Token is not configured in Admin Infrastructure settings.');
    }

    return { token, teamId: teamId || undefined };
  }

  private static getApiUrl(path: string, teamId?: string): string {
    const base = `https://api.vercel.com${path}`;
    if (teamId) {
      const sep = path.includes('?') ? '&' : '?';
      return `${base}${sep}teamId=${teamId}`;
    }
    return base;
  }

  /**
   * Ensure a Vercel Project exists for the Free Tool
   */
  static async createOrGetProject(projectName: string, framework = 'nextjs'): Promise<{ id: string; name: string }> {
    const { token, teamId } = await this.getAuthHeaders();
    const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 99);

    // 1. Check if project already exists
    const checkRes = await fetch(this.getApiUrl(`/v9/projects/${sanitizedName}`, teamId), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      return { id: data.id, name: data.name };
    }

    // 2. Create project if not exists
    const createRes = await fetch(this.getApiUrl('/v9/projects', teamId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sanitizedName,
        framework,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Vercel project: ${createRes.status}`);
    }

    const createdData = await createRes.json();
    return { id: createdData.id, name: createdData.name };
  }

  /**
   * Set or update environment variables on the isolated Vercel project
   */
  static async setProjectEnvVars(
    projectId: string,
    envVars: Record<string, string>
  ): Promise<void> {
    const { token, teamId } = await this.getAuthHeaders();

    for (const [key, value] of Object.entries(envVars)) {
      if (!value) continue;
      await fetch(this.getApiUrl(`/v10/projects/${projectId}/env`, teamId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview', 'development'],
        }),
      });
    }
  }

  /**
   * Deploy GitHub repository via Vercel API
   */
  static async deployFromGitHub(params: {
    projectName: string;
    repo: string; // e.g. "atharva/flat-ai-tool"
    branch?: string;
    envVars?: Record<string, string>;
  }): Promise<VercelDeploymentResult> {
    try {
      const { token, teamId } = await this.getAuthHeaders();
      const project = await this.createOrGetProject(params.projectName);

      if (params.envVars && Object.keys(params.envVars).length > 0) {
        await this.setProjectEnvVars(project.id, params.envVars);
      }

      const branch = params.branch || 'main';
      const [owner, repoName] = params.repo.split('/');

      const deployRes = await fetch(this.getApiUrl('/v13/deployments', teamId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: project.name,
          project: project.id,
          gitSource: {
            type: 'github',
            repo: params.repo,
            ref: branch,
            repoId: `${owner}/${repoName}`,
          },
          target: 'production',
        }),
      });

      if (!deployRes.ok) {
        const err = await deployRes.json().catch(() => ({}));
        return {
          success: false,
          error: err.error?.message || `Vercel deployment failed with status ${deployRes.status}`,
        };
      }

      const data = await deployRes.json();
      return {
        success: true,
        deploymentId: data.id,
        deploymentUrl: `https://${data.url}`,
        productionUrl: `https://${project.name}.vercel.app`,
        status: data.readyState || 'BUILDING',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to deploy from GitHub to Vercel',
      };
    }
  }

  /**
   * Validate and unpack uploaded ZIP archive for Next.js project
   */
  static async validateZipArchive(zipBuffer: Buffer): Promise<{
    valid: boolean;
    filesCount: number;
    hasPackageJson: boolean;
    hasNextConfig: boolean;
    error?: string;
  }> {
    try {
      const zip = await JSZip.loadAsync(zipBuffer);
      let hasPackageJson = false;
      let hasNextConfig = false;
      let filesCount = 0;

      for (const [filename, file] of Object.entries(zip.files)) {
        if (file.dir) continue;
        filesCount++;

        // Reject dangerous path traversal
        if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
          return { valid: false, filesCount, hasPackageJson, hasNextConfig, error: `Invalid relative file path in ZIP: ${filename}` };
        }

        // Check root package.json
        if (filename === 'package.json' || filename.endsWith('/package.json')) {
          hasPackageJson = true;
        }

        // Check next.config
        if (filename.includes('next.config.')) {
          hasNextConfig = true;
        }
      }

      if (!hasPackageJson) {
        return {
          valid: false,
          filesCount,
          hasPackageJson,
          hasNextConfig,
          error: 'Missing package.json in the root of the ZIP archive. Please ensure this is a valid Next.js project.',
        };
      }

      return {
        valid: true,
        filesCount,
        hasPackageJson,
        hasNextConfig,
      };
    } catch (err: any) {
      return {
        valid: false,
        filesCount: 0,
        hasPackageJson: false,
        hasNextConfig: false,
        error: `Corrupt or unsupported ZIP file: ${err.message}`,
      };
    }
  }

  /**
   * Deploy uploaded ZIP project archive to Vercel via File Upload API
   */
  static async deployZipProject(params: {
    projectName: string;
    zipBuffer: Buffer;
    envVars?: Record<string, string>;
  }): Promise<VercelDeploymentResult> {
    try {
      const { token, teamId } = await this.getAuthHeaders();
      const validation = await this.validateZipArchive(params.zipBuffer);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const project = await this.createOrGetProject(params.projectName);

      if (params.envVars && Object.keys(params.envVars).length > 0) {
        await this.setProjectEnvVars(project.id, params.envVars);
      }

      const zip = await JSZip.loadAsync(params.zipBuffer);
      const files: Array<{ file: string; data: string; encoding: 'base64' }> = [];

      for (const [relativePath, fileObj] of Object.entries(zip.files)) {
        if (fileObj.dir) continue;
        // Exclude huge / sensitive local folders if user included them by accident
        if (
          relativePath.includes('node_modules/') ||
          relativePath.includes('.next/') ||
          relativePath.includes('.git/') ||
          relativePath.endsWith('.env.local')
        ) {
          continue;
        }

        const content = await fileObj.async('base64');
        files.push({
          file: relativePath.replace(/^[^/]+\//, ''), // normalize root folder if zipped as subfolder
          data: content,
          encoding: 'base64',
        });
      }

      // Create Vercel direct files deployment
      const deployRes = await fetch(this.getApiUrl('/v13/deployments', teamId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: project.name,
          project: project.id,
          files,
          target: 'production',
        }),
      });

      if (!deployRes.ok) {
        const err = await deployRes.json().catch(() => ({}));
        return {
          success: false,
          error: err.error?.message || `Vercel file deployment failed: ${deployRes.status}`,
        };
      }

      const data = await deployRes.json();
      return {
        success: true,
        deploymentId: data.id,
        deploymentUrl: `https://${data.url}`,
        productionUrl: `https://${project.name}.vercel.app`,
        status: data.readyState || 'BUILDING',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to deploy ZIP archive to Vercel',
      };
    }
  }

  /**
   * Poll Vercel deployment state & build health
   */
  static async getDeploymentStatus(deploymentId: string): Promise<VercelDeploymentResult> {
    try {
      const { token, teamId } = await this.getAuthHeaders();
      const res = await fetch(this.getApiUrl(`/v13/deployments/${deploymentId}`, teamId), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `Failed to fetch deployment status: ${res.status}` };
      }

      const data = await res.json();
      return {
        success: true,
        deploymentId: data.id,
        deploymentUrl: `https://${data.url}`,
        status: data.readyState, // READY, ERROR, BUILDING, CANCELED
        logs: data.inspectorUrl,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Health Check: HTTP ping against the deployed public URL
   */
  static async verifyDeploymentHealth(url: string): Promise<{ healthy: boolean; statusCode?: number; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
      const res = await fetch(cleanUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'BenzWell-Health-Probe/1.0' },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const latencyMs = Date.now() - startTime;
      return {
        healthy: res.status >= 200 && res.status < 400,
        statusCode: res.status,
        latencyMs,
      };
    } catch (err: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: err.message || 'Health probe timed out or failed to connect',
      };
    }
  }
}
