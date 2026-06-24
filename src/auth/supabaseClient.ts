/**
 * Supabase Auth client  (GDD §8.2)
 *
 * Configured via Vite env vars — set VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY in .env.local for each environment.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined;

function buildClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — login is disabled.');
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('[auth] Failed to initialise Supabase client:', err);
    return null;
  }
}

export const supabase: SupabaseClient | null = buildClient();
