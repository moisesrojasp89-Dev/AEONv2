/* ============================================================
   AEON · supabaseClient.js — Supabase Client Singleton
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[AEON] Error Crítico: Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en la configuración.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
