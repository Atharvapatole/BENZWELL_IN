import { Client, Databases, Users, Storage } from 'node-appwrite';
import { CredentialService } from '@/lib/services/credential-service';

export interface AppwriteServerInstance {
  client: Client;
  databases: Databases;
  users: Users;
  storage: Storage;
  databaseId: string;
  projectId: string;
  endpoint: string;
}

/**
 * Server-side Appwrite client singleton / factory.
 * Strictly loads credentials from encrypted settings or server environment variables.
 * Never hardcodes or defaults to 'default'.
 */
export async function getAppwriteServerClient(): Promise<AppwriteServerInstance> {
  const endpoint =
    (await CredentialService.getCredentialServerOnly('appwrite', 'endpoint')) ||
    process.env.APPWRITE_ENDPOINT ||
    'https://cloud.appwrite.io/v1';

  const projectId =
    (await CredentialService.getCredentialServerOnly('appwrite', 'project_id')) ||
    process.env.APPWRITE_PROJECT_ID;

  const apiKey =
    (await CredentialService.getCredentialServerOnly('appwrite', 'api_key')) ||
    process.env.APPWRITE_API_KEY;

  const databaseId =
    (await CredentialService.getCredentialServerOnly('appwrite', 'database_id')) ||
    process.env.APPWRITE_DATABASE_ID;

  if (!projectId || !apiKey) {
    throw new Error(
      'Appwrite Project ID and API Key are required. Please configure them in Admin → Settings → Infrastructure or via environment variables (APPWRITE_PROJECT_ID, APPWRITE_API_KEY).'
    );
  }

  if (!databaseId) {
    throw new Error(
      'Appwrite Database ID is not configured. Please set APPWRITE_DATABASE_ID in environment or configure Database ID in Admin → Settings → Infrastructure.'
    );
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);
  const users = new Users(client);
  const storage = new Storage(client);

  return {
    client,
    databases,
    users,
    storage,
    databaseId,
    projectId,
    endpoint,
  };
}
