import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'datafoot_supabase_url';
const SUPABASE_KEY_KEY = 'datafoot_supabase_key';

const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

let _client: SupabaseClient | null = null;

export function getSupabaseConfig() {
  return {
    url: localStorage.getItem(SUPABASE_URL_KEY) || DEFAULT_URL,
    key: localStorage.getItem(SUPABASE_KEY_KEY) || DEFAULT_KEY,
  };
}

export function setSupabaseConfig(url: string, key: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_KEY_KEY, key);
  _client = null; // reset client so next call recreates it
}

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const { url, key } = getSupabaseConfig();
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _client;
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createClient(url, key);
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: msg };
  }
}

export default getSupabaseClient;
