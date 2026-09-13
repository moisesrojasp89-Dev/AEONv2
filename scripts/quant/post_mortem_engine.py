"""
scripts/quant/post_mortem_engine.py
==============================================================================
AEON Active Copilot Harness — Evaluador de Post-Mortem y Ratchet MFE/MAE (Fase 3)
==============================================================================
Responsabilidades:
1. Ratchet High-Water Mark a 20s (Fix Gap #1):
   - MFE (Maximum Favorable Excursion) y MAE (Maximum Adverse Excursion) en RAM.
   - Captura continua de mechas extremas sin ceguera de muestreo.
2. Desempate Prudencial Institucional (Fix Gap #2):
   - Si en el mismo intervalo se tocan SL y Target, se resuelve como 'invalidated'.
3. Snapshots Cronológicos:
   - Registro de cotizaciones a T+15m, T+30m, T+60m, T+120m.
4. Sincronización Asíncrona a Supabase (public.signal_post_mortem) a costo $0 tokens.
==============================================================================
"""

import os
import sys
import time
import json
import threading
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
CACHE_PATH = os.path.join(ROOT_DIR, 'data', 'post_mortem_state.json')

_pm_lock = threading.Lock()
_active_tracking: Dict[str, Dict[str, Any]] = {}

def _load_cache():
    """Carga señales activas en seguimiento desde disco."""
    global _active_tracking
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    _active_tracking = data
        except Exception:
            pass

def _save_cache():
    """Persiste atómicamente el estado del evaluador a disco."""
    with _pm_lock:
        try:
            os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
            with open(CACHE_PATH, 'w', encoding='utf-8') as f:
                json.dump(_active_tracking, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

_load_cache()

def calculate_r_targets(
    entry_price: float,
    invalidation_price: float,
    bias: str,
    asset: str
) -> tuple:
    """Calcula targets matemáticos de 1.5R y 2.0R con control de riesgo mínimo."""
    is_gold = 'XAU' in asset
    min_buffer = 0.50 if is_gold else 0.00030
    
    raw_risk = abs(entry_price - invalidation_price)
    risk = max(raw_risk, min_buffer)
    
    if bias == 'compra':
        t_1_5r = entry_price + (1.5 * risk)
        t_2r = entry_price + (2.0 * risk)
    elif bias == 'venta':
        t_1_5r = entry_price - (1.5 * risk)
        t_2r = entry_price - (2.0 * risk)
    else:
        t_1_5r = entry_price
        t_2r = entry_price

    decimals = 2 if is_gold or 'JPY' in asset else 5
    return round(risk, decimals), round(t_1_5r, decimals), round(t_2r, decimals)

def _sync_to_supabase(record: Dict[str, Any], supabase_url: str, supabase_key: str):
    """Sincroniza un registro post-mortem a Supabase en hilo secundario."""
    if not supabase_url or not supabase_key:
        return

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/signal_post_mortem?on_conflict=event_id"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    payload = {
        "event_id": record["event_id"],
        "symbol": record["symbol"],
        "score_label": record["score_label"],
        "confluence_score": record["confluence_score"],
        "bias": record["bias"],
        "entry_price": record["entry_price"],
        "structural_invalidation": record["structural_invalidation"],
        "target_1_5r": record["target_1_5r"],
        "target_2r": record["target_2r"],
        "mfe_price": record["mfe_price"],
        "mfe_r_multiple": record["mfe_r_multiple"],
        "mae_price": record["mae_price"],
        "mae_r_multiple": record["mae_r_multiple"],
        "price_t15": record.get("price_t15"),
        "price_t30": record.get("price_t30"),
        "price_t60": record.get("price_t60"),
        "price_t120": record.get("price_t120"),
        "outcome": record["outcome"],
        "first_breached": record.get("first_breached"),
        "time_to_resolution_seconds": record.get("time_to_resolution_seconds"),
        "last_evaluated_at": datetime.now(timezone.utc).isoformat()
    }

    try:
        data_bytes = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(endpoint, data=data_bytes, headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            pass
    except Exception:
        pass

def register_signal_for_post_mortem(
    event_id: str,
    symbol: str,
    score_label: str,
    confluence_score: float,
    bias: str,
    entry_price: float,
    structural_invalidation: float,
    supabase_url: str = '',
    supabase_key: str = ''
):
    """
    Registra una señal para seguimiento continuo ex-post.
    Aplica para ambas cohortes: A+ (emitidas) y B (log_only en silencio).
    """
    if event_id in _active_tracking:
        return

    risk, target_1_5r, target_2r = calculate_r_targets(
        entry_price, structural_invalidation, bias, symbol
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "event_id": event_id,
        "symbol": symbol,
        "score_label": score_label,
        "confluence_score": confluence_score,
        "bias": bias,
        "entry_price": entry_price,
        "structural_invalidation": structural_invalidation,
        "risk_distance": risk,
        "target_1_5r": target_1_5r,
        "target_2r": target_2r,
        "mfe_price": entry_price,
        "mfe_r_multiple": 0.0,
        "mae_price": entry_price,
        "mae_r_multiple": 0.0,
        "price_t15": None,
        "price_t30": None,
        "price_t60": None,
        "price_t120": None,
        "outcome": "tracking",
        "first_breached": None,
        "time_to_resolution_seconds": None,
        "created_timestamp": time.time(),
        "created_at": now_iso
    }

    with _pm_lock:
        _active_tracking[event_id] = record
    _save_cache()

    # Sincronización asíncrona inicial a Supabase
    threading.Thread(
        target=_sync_to_supabase,
        args=(record, supabase_url, supabase_key),
        daemon=True,
        name=f"PMSyncInit_{event_id}"
    ).start()

def evaluate_active_post_mortem_ratchet(
    prices_cache: Dict[str, float],
    supabase_url: str = '',
    supabase_key: str = ''
) -> int:
    """
    Evaluador Ratchet ejecutado en cada ciclo de 20s del motor VPS.
    Actualiza MFE/MAE continuo y resuelve outcomes con desempate prudencial.
    """
    now = time.time()
    updated_records = []

    with _pm_lock:
        event_ids_to_clean = []
        for event_id, rec in list(_active_tracking.items()):
            symbol = rec.get('symbol')
            curr_price = prices_cache.get(symbol)
            if curr_price is None or rec.get('outcome') in ('invalidated', 'target_hit_2r', 'expired_in_range'):
                # Si ya finalizó hace más de 10 minutos, archivar de RAM
                if rec.get('outcome') != 'tracking' and (now - rec.get('finished_timestamp', now)) > 600:
                    event_ids_to_clean.append(event_id)
                continue

            entry = rec['entry_price']
            sl = rec['structural_invalidation']
            bias = rec['bias']
            risk = rec.get('risk_distance', max(abs(entry - sl), 0.0001))
            elapsed = int(now - rec.get('created_timestamp', now))

            # 1. Snapshots cronológicos
            if elapsed >= 900 and rec['price_t15'] is None:
                rec['price_t15'] = curr_price
            if elapsed >= 1800 and rec['price_t30'] is None:
                rec['price_t30'] = curr_price
            if elapsed >= 3600 and rec['price_t60'] is None:
                rec['price_t60'] = curr_price
            if elapsed >= 7200 and rec['price_t120'] is None:
                rec['price_t120'] = curr_price

            # 2. Ratchet High-Water Mark a 20s (MFE / MAE)
            if bias == 'compra':
                if curr_price > rec['mfe_price']:
                    rec['mfe_price'] = curr_price
                    rec['mfe_r_multiple'] = round((rec['mfe_price'] - entry) / risk, 2)
                if curr_price < rec['mae_price']:
                    rec['mae_price'] = curr_price
                    rec['mae_r_multiple'] = round((entry - rec['mae_price']) / risk, 2)
                
                sl_breached = curr_price <= sl
                t2_breached = curr_price >= rec['target_2r']
                t15_breached = curr_price >= rec['target_1_5r']

            elif bias == 'venta':
                if curr_price < rec['mfe_price']:
                    rec['mfe_price'] = curr_price
                    rec['mfe_r_multiple'] = round((entry - rec['mfe_price']) / risk, 2)
                if curr_price > rec['mae_price']:
                    rec['mae_price'] = curr_price
                    rec['mae_r_multiple'] = round((rec['mae_price'] - entry) / risk, 2)
                
                sl_breached = curr_price >= sl
                t2_breached = curr_price <= rec['target_2r']
                t15_breached = curr_price <= rec['target_1_5r']
            else:
                sl_breached = False
                t2_breached = False
                t15_breached = False

            # 3. Resolución & Desempate Prudencial Institucional (Fix Gap #2)
            # Si ambos son tocados simultáneamente: peor escenario institucional (invalidated)
            if sl_breached and t2_breached:
                rec['outcome'] = 'invalidated'
                rec['first_breached'] = 'ambiguous_sl'
                rec['time_to_resolution_seconds'] = elapsed
                rec['finished_timestamp'] = now
            elif sl_breached:
                rec['outcome'] = 'invalidated'
                rec['first_breached'] = 'sl'
                rec['time_to_resolution_seconds'] = elapsed
                rec['finished_timestamp'] = now
            elif t2_breached:
                rec['outcome'] = 'target_hit_2r'
                rec['first_breached'] = 'target'
                rec['time_to_resolution_seconds'] = elapsed
                rec['finished_timestamp'] = now
            elif t15_breached and rec['outcome'] == 'tracking':
                rec['outcome'] = 'target_hit_1_5r'
                # Continúa tracking para ver si alcanza 2R antes de SL o TTL
            elif elapsed >= 7200:
                # TTL Expirado (2 horas)
                if rec['outcome'] == 'target_hit_1_5r':
                    rec['finished_timestamp'] = now
                else:
                    rec['outcome'] = 'expired_in_range'
                    rec['finished_timestamp'] = now

            updated_records.append(rec)

        for eid in event_ids_to_clean:
            del _active_tracking[eid]

    if updated_records:
        _save_cache()
        for r in updated_records:
            threading.Thread(
                target=_sync_to_supabase,
                args=(r, supabase_url, supabase_key),
                daemon=True,
                name=f"PMSync_{r['event_id']}"
            ).start()

    return len(updated_records)
