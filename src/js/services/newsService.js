/* ============================================================
   AEON · services/newsService.js — News Data Layer
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';

/**
 * Fetches latest market news from Supabase with fallback to local static data.
 * @param {Array} fallbackData
 * @returns {Promise<Array>}
 */
export async function fetchNews(fallbackData = []) {
  try {
    const { data: newsItems, error } = await supabase
      .from(DB_TABLES.NEWS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (newsItems && newsItems.length > 0) {
      return newsItems;
    }
    return fallbackData;
  } catch (err) {
    console.warn('[AEON] Supabase news offline, using fallback:', err.message);
    return fallbackData;
  }
}
