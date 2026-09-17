/* ============================================================
   AEON · supabaseClient.js — Supabase Client Singleton
   Safe client initialized from Vite environment variables
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://ueukfjowysadezsmtzto.supabase.co';
const supabaseAnonKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_FLqduPV44C5R6TCJjB8hpQ_j9FsdYHW';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
