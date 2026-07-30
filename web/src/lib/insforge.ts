import { createClient } from '@insforge/sdk';

// Seerist's own backend — an InsForge project (Postgres + auth + storage +
// edge functions + model gateway). The anon key is a public client credential.
export const INSFORGE_URL =
  import.meta.env.VITE_INSFORGE_URL || 'https://si9f4zab.eu-central.insforge.app';
export const INSFORGE_ANON_KEY =
  import.meta.env.VITE_INSFORGE_ANON_KEY ||
  'anon_7ce1c8516e22d8090c0d06f724319b00b352bd6357f783756ea8c1871d4993a1';

export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

/** Invoke a Seerist edge function; throws with the server's error message. */
export async function callFn<T = any>(slug: string, body?: unknown): Promise<T> {
  const { data, error } = await insforge.functions.invoke(slug, { body: body ?? {} });
  if (error) {
    const detail = (data as any)?.error || (error as any)?.message || 'Request failed';
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (data && typeof data === 'object' && 'error' in (data as any) && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return data as T;
}

export const db = () => insforge.database;
