/* ============================================================
   AEON · services/signalService.js — Signal Data Layer
   ============================================================ */

import { supabase } from '../supabaseClient.js';
import { DB_TABLES, SIGNAL_STATUS } from '../config/constants.js';

/**
 * Fetches active public signals and merges private PRO data if authenticated as Pro.
 * @param {boolean} isPro
 * @returns {Promise<Array>}
 */
export async function fetchActiveSignals(isPro = false) {
  const { data: publicSignals, error: pErr } = await supabase
    .from(DB_TABLES.SIGNALS)
    .select('*')
    .in('status', [SIGNAL_STATUS.ACTIVE, SIGNAL_STATUS.HIT_TP1])
    .order('timestamp', { ascending: false })
    .limit(12);

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
 * Fetches closed signals for the Track Record & History module.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchSignalHistory(limit = 50) {
  const { data: closedSignals, error } = await supabase
    .from(DB_TABLES.SIGNALS)
    .select('*')
    .in('status', [
      SIGNAL_STATUS.CLOSED_TP,
      SIGNAL_STATUS.CLOSED_BE,
      SIGNAL_STATUS.CLOSED_SL,
      SIGNAL_STATUS.WON,
      SIGNAL_STATUS.LOST
    ])
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return closedSignals || [];
}

/**
 * Fetches server-aggregated Track Record summary via Postgres RPC (0ms lag, 100% full dataset).
 * Falls back to client-side calculation if RPC is not available.
 * @param {Array} fallbackSignals
 * @returns {Promise<Object>}
 */
export async function fetchTrackRecordMetrics(fallbackSignals = []) {
  try {
    const { data, error } = await supabase.rpc('get_track_record_summary');
    if (!error && data && typeof data === 'object' && Number.isFinite(data.total)) {
      return data;
    }
  } catch (err) {
    console.warn('[signalService] RPC get_track_record_summary fallback:', err.message);
  }
  return calculateTrackRecordMetrics(fallbackSignals);
}

/**
 * Calculates mathematical metrics for the Track Record Dashboard (Fallback Engine).
 * Excludes open trades strictly and uses Number.isFinite() to avoid NaN propagation.
 * @param {Array} signals
 * @returns {Object}
 */
export function calculateTrackRecordMetrics(signals = []) {
  const closed = signals.filter(s => [
    SIGNAL_STATUS.CLOSED_TP,
    SIGNAL_STATUS.CLOSED_BE,
    SIGNAL_STATUS.CLOSED_SL,
    SIGNAL_STATUS.WON,
    SIGNAL_STATUS.LOST
  ].includes(s.status));
  const total = closed.length;
  
  if (total === 0) {
    return {
      total: 0,
      won: 0,
      be: 0,
      lost: 0,
      winRate: '0.0%',
      profitFactor: '0.00',
      avgR: '0.00',
      totalR: '+0.0R'
    };
  }

  let wonCount = 0;
  let beCount = 0;
  let lostCount = 0;
  let totalGainsR = 0;
  let totalLossesR = 0;

  closed.forEach(s => {
    let r = 0;
    if (Number.isFinite(s.confluences?.realized_r)) {
      r = s.confluences.realized_r;
    } else if (s.status === 'closed_tp' || s.status === 'won') {
      r = Number(s.confluences?.rr_ratio) || 2.5;
    } else if (s.status === 'closed_be') {
      r = 0.0;
    } else if (s.status === 'closed_sl' || s.status === 'lost') {
      r = -1.0;
    }

    if (s.status === 'closed_tp' || s.status === 'won' || r > 0) {
      wonCount++;
      totalGainsR += r;
    } else if (s.status === 'closed_be' || r === 0) {
      beCount++;
    } else if (s.status === 'closed_sl' || s.status === 'lost' || r < 0) {
      lostCount++;
      totalLossesR += Math.abs(r);
    }
  });

  const decisiveTrades = wonCount + lostCount;
  const winRate = decisiveTrades > 0 ? ((wonCount / decisiveTrades) * 100).toFixed(1) + '%' : '0.0%';
  const profitFactor = totalLossesR > 0 
    ? (totalGainsR / totalLossesR).toFixed(2) 
    : (totalGainsR > 0 ? '∞' : '0.00');
  const avgR = wonCount > 0 ? (totalGainsR / wonCount).toFixed(2) : '2.50';
  const netR = (totalGainsR - totalLossesR).toFixed(1);
  const totalR = (netR >= 0 ? `+${netR}` : `${netR}`) + 'R';

  return {
    total,
    won: wonCount,
    be: beCount,
    lost: lostCount,
    winRate,
    profitFactor,
    avgR,
    totalR
  };
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
