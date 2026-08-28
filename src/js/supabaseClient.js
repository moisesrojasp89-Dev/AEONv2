/* ============================================================
   AEON · supabaseClient.js — Supabase Client Singleton
   Safe client initialized from Vite environment variables
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://ytccnxlfakjilxwauxic.supabase.co';
const supabaseAnonKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
