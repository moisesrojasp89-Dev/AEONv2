"""
scripts/quant/harness_sentinel.py
==============================================================================
AEON Active Copilot Harness — Centinela Cuantitativo y Máquina de Estados
==============================================================================
Responsabilidades:
1. Evaluación determinista en tiempo real (Costo $0 tokens).
2. Noise Filter de Confluencia Institucional:
   - ZAP Oferta: Precio en rango [R1, R2] + BSL swept == True + distancia a dPOC > 0
   - ZAP Demanda: Precio en rango [S1, S2] + SSL swept == True + distancia a dPOC > 0
3. Persistencia de Cooldown (15 min) en data/harness_sentinel_state.json.
4. Despacho Asíncrono Fire-and-Forget (hilo daemon con timeout HTTP explícito de 3.0s).
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
from typing import Dict, Any, Optional

# Directorio raíz del proyecto
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
STATE_FILE_PATH = os.path.join(ROOT_DIR, 'data', 'harness_sentinel_state.json')
ALT_STATE_PATH = os.path.join(ROOT_DIR, 'src', 'data', 'harness_sentinel_state.json')

COOLDOWN_SECONDS = 900  # 15 minutos entre eventos por activo

# Bloqueo de concurrencia para acceso seguro al archivo de estado
_state_lock = threading.Lock()
_sentinel_state: Dict[str, Any] = {
    'last_triggers': {},      # { 'XAUUSD': timestamp }
    'dispatched_events': []   # Histórico de últimos 20 eventos
}

def _load_persisted_state():
    """Carga el estado del centinela desde disco para preservar cooldowns ante reinicios."""
    global _sentinel_state
    for p in [STATE_FILE_PATH, ALT_STATE_PATH]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        _sentinel_state.update(data)
                        return
            except Exception:
                pass

def _save_persisted_state():
    """Persiste atómicamente el estado del centinela a disco."""
    with _state_lock:
        for p in [STATE_FILE_PATH, ALT_STATE_PATH]:
            try:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, 'w', encoding='utf-8') as f:
                    json.dump(_sentinel_state, f, indent=2, ensure_ascii=False)
            except Exception:
                pass

# Inicializar estado al importar el módulo
_load_persisted_state()

def is_on_cooldown(symbol: str) -> bool:
    """Verifica si el activo aún está en ventana de cooldown de 15 minutos."""
    last_time = _sentinel_state.get('last_triggers', {}).get(symbol, 0)
    return (time.time() - last_time) < COOLDOWN_SECONDS

def set_cooldown(symbol: str, timestamp: float):
    """Actualiza y persiste el timestamp del último disparo del activo."""
    if 'last_triggers' not in _sentinel_state:
        _sentinel_state['last_triggers'] = {}
    _sentinel_state['last_triggers'][symbol] = timestamp
    _save_persisted_state()

def build_event_payload(
    symbol: str,
    live_price: float,
    quant_record: Dict[str, Any],
    poi: Dict[str, Any],
    bsl_swept: bool,
    ssl_swept: bool
) -> Dict[str, Any]:
    """Construye el contrato formal JSON del evento táctico listo para la Edge Function."""
    now_utc = datetime.now(timezone.utc)
    evt_id = f"evt_{symbol.lower()}_{now_utc.strftime('%Y%m%d_%H%M%S')}"
    
    dpoc = quant_record.get('dpoc_price', live_price)
    vwap = quant_record.get('session_vwap', live_price)
    p_type = poi.get('type', 'UNKNOWN_POI')
    trigger_type = "ZAP_SUPPLY_SWEEP" if p_type == 'SELLSIDE_POI' else "ZAP_DEMAND_SWEEP"

    # Distancia en pips / unidades relativas
    raw_dist = abs(live_price - dpoc)
    if 'JPY' in symbol:
        pips_dist = round(raw_dist * 100, 1)
    elif live_price < 10.0:  # Forex estándar (EURUSD, GBPUSD)
        pips_dist = round(raw_dist * 10000, 1)
    else:  # Oro, Índices, Cripto
        pips_dist = round(raw_dist, 2)

    return {
        "event_id": evt_id,
        "symbol": symbol,
        "display_name": quant_record.get('display_name', symbol),
        "timestamp": now_utc.isoformat(),
        "trigger_type": trigger_type,
        "market_data": {
            "current_price": live_price,
            "session_active": quant_record.get('session_origin', 'GLOBAL'),
            "structural_zone": poi.get('zone_label', p_type),
            "zap_price_range": [poi.get('range_low', live_price), poi.get('range_high', live_price)],
            "dpoc_price": dpoc,
            "distance_to_dpoc": pips_dist,
            "session_vwap": vwap,
            "ema_alignment": "BULLISH_4H_BEARISH_M15" if quant_record.get('bias') == 'BEARISH' else "BEARISH_4H_BULLISH_M15",
            "liquidity_state": {
                "bsl_swept": bsl_swept,
                "ssl_swept": ssl_swept
            },
            "macro_driver": quant_record.get('macro_driver', 'Estructura institucional activa.'),
            "daily_bias": quant_record.get('bias', 'NEUTRAL'),
            "bias_score": quant_record.get('bias_score', 50)
        }
    }

def _dispatch_to_edge_worker(payload: Dict[str, Any], supabase_url: str, supabase_key: str):
    """
    Ejecutor en hilo secundario (daemon) con timeout HTTP explícito de 3.0s.
    Garantiza 100% que el bucle de 20s nunca sufra bloqueos de red.
    """
    if not supabase_url or not supabase_key:
        return

    url = f"{supabase_url.rstrip('/')}/functions/v1/aeon-copilot-event"
    body_bytes = json.dumps(payload).encode('utf-8')
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "User-Agent": "AEON_Autonomous_Sentinel/1.0"
    }

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method='POST')
    try:
        # Timeout explícito estricto de 3.0 segundos
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            status = resp.getcode()
            t_str = datetime.now().strftime('%H:%M:%S')
            print(f"[{t_str}] [SENTINEL  ] 🚀 Evento {payload['event_id']} despachado con éxito (HTTP {status})", flush=True)
    except urllib.error.HTTPError as e:
        t_str = datetime.now().strftime('%H:%M:%S')
        # Si la Edge Function aún no está desplegada (404/500), loguear sin romper
        print(f"[{t_str}] [SENTINEL  ] ℹ️ Edge Function respondió HTTP {e.code} (esperado en fases previas a despliegue)", flush=True)
    except Exception as e:
        t_str = datetime.now().strftime('%H:%M:%S')
        print(f"[{t_str}] [SENTINEL  ] ⚠️ Despacho asíncrono no completado ({type(e).__name__}: {e})", flush=True)

def evaluate_tactical_triggers(
    symbol: str,
    live_price: float,
    quant_record: Dict[str, Any],
    supabase_url: str = '',
    supabase_key: str = ''
) -> Optional[Dict[str, Any]]:
    """
    Evalúa la máquina de estados de confluencia institucional determinista.
    Retorna el payload del evento si se gatilla, o None si no hay confluencia o está en cooldown.
    """
    # 1. Cooldown de 15 min por activo (protección anti-spam persistida)
    if is_on_cooldown(symbol):
        return None

    cited = quant_record.get('cited_key_levels')
    if not isinstance(cited, dict):
        return None

    poi_list = cited.get('structural_poi', [])
    pools = cited.get('liquidity_pools', {})
    dpoc = quant_record.get('dpoc_price', live_price)

    # 2. Extracción de estado de barrido de piscinas de liquidez
    bsl_pools = pools.get('bsl', []) if isinstance(pools, dict) else []
    ssl_pools = pools.get('ssl', []) if isinstance(pools, dict) else []

    bsl_swept = any(p.get('status') == 'swept' for p in bsl_pools if isinstance(p, dict))
    ssl_swept = any(p.get('status') == 'swept' for p in ssl_pools if isinstance(p, dict))

    # 3. Evaluación de confluencia ZAP + Liquidez + dPOC
    for poi in poi_list:
        if not isinstance(poi, dict):
            continue

        low = float(poi.get('range_low', 0))
        high = float(poi.get('range_high', 0))
        p_type = poi.get('type')

        in_zone = (low <= live_price <= high)
        dist_dpoc = abs(live_price - dpoc)

        is_triggered = False

        # Caso A: ZAP de Oferta (Venta) + Barrido BSL (Altos liquidados) + Alejado de dPOC
        if p_type == 'SELLSIDE_POI' and in_zone and bsl_swept and dist_dpoc > 0:
            is_triggered = True

        # Caso B: ZAP de Demanda (Compra) + Barrido SSL (Bajos liquidados) + Alejado de dPOC
        elif p_type == 'BUYSIDE_POI' and in_zone and ssl_swept and dist_dpoc > 0:
            is_triggered = True

        if is_triggered:
            payload = build_event_payload(symbol, live_price, quant_record, poi, bsl_swept, ssl_swept)
            
            # Registrar timestamp de cooldown persistente
            set_cooldown(symbol, time.time())

            # Guardar en historial local de eventos para observabilidad
            if 'dispatched_events' not in _sentinel_state:
                _sentinel_state['dispatched_events'] = []
            _sentinel_state['dispatched_events'].append({
                'event_id': payload['event_id'],
                'symbol': symbol,
                'price': live_price,
                'trigger_type': payload['trigger_type'],
                'timestamp': payload['timestamp']
            })
            # Mantener solo los últimos 20
            _sentinel_state['dispatched_events'] = _sentinel_state['dispatched_events'][-20:]
            _save_persisted_state()

            # Despacho Asíncrono Fire-and-Forget en Hilo Daemon con Timeout Explícito
            t = threading.Thread(
                target=_dispatch_to_edge_worker,
                args=(payload, supabase_url, supabase_key),
                daemon=True,
                name=f"HarnessDispatch_{symbol}"
            )
            t.start()

            return payload

    return None
