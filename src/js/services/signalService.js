/* ============================================================
   AEON · services/signalService.js — Signal Data Layer
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES } from '../config/constants.js';

/**
 * Fetches active public signals and merges private PRO data if authenticated as Pro.
 * @param {boolean} isPro
 * @returns {Promise<Array>}
 */
export async function fetchActiveSignals(isPro = false) {
  const { data: publicSignals, error: pErr } = await supabase
    .from(DB_TABLES.SIGNALS)
    .select('*')
    .in('status', ['active', 'hit_tp1', 'won', 'lost', 'closed_tp', 'closed_sl'])
    .order('timestamp', { ascending: false })
    .limit(10);

  if (pErr) throw pErr;

  const signals = publicSignals || [];

  if (isPro && signals.length > 0) {
    const signalIds = signals.map(s => s.id);
    const { data: proData, error: proErr } = await supabase
      .from(DB_TABLES.SIGNALS_PRO_DATA)
      .select('*')
      .in('signal_id', signalIds);

    if (proErr) {
      console.warn('[signalService] Pro query notice:', proErr);
    }

    if (proData && proData.length > 0) {
      proData.forEach(proInfo => {
        const target = signals.find(s => s.id === proInfo.signal_id);
        if (target) {
          Object.assign(target, proInfo);
        }
      });
    }
  }

  return signals;
}

/**
 * Subscribes to Realtime Postgres changes for public signals and private PRO data.
 */
export function subscribeSignalEvents({
  onPublicInsert,
  onPublicUpdate,
  onProInsert,
  onReconnect,
  isPro = false,
}) {
  const publicChannel = supabase.channel('public:signals')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: DB_TABLES.SIGNALS }, payload => {
      if (onPublicInsert) onPublicInsert(payload.new);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: DB_TABLES.SIGNALS }, payload => {
      if (onPublicUpdate) onPublicUpdate(payload.new);
    })
    .on('system', { event: 'EXTENSION' }, () => {
      if (onReconnect) onReconnect();
    })
    .subscribe();

  let proChannel = null;
  if (isPro) {
    proChannel = supabase.channel('public:signals_pro_data')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: DB_TABLES.SIGNALS_PRO_DATA }, payload => {
        if (onProInsert) onProInsert(payload.new);
      })
      .subscribe();
  }

  return { publicChannel, proChannel };
}
