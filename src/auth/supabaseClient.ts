/**
 * Supabase Auth client  (GDD §8.2)
 *
 * Configured via Vite env vars — set VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY in .env.local for each environment.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — login is disabled.');
}

// createClient throws on an empty/invalid URL, which would crash the whole
// app at import time when Supabase isn't configured — fall back to a
// syntactically valid placeholder so login simply stays disabled instead.
export const supabase = createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder-anon-key');
