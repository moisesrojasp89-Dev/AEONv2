"""
scripts/quant/harness_sentinel.py
==============================================================================
AEON Active Copilot Harness — Centinela Cuantitativo y Máquina de Estados (MAS v1.0.0)
==============================================================================
Responsabilidades (Fases 1 y 2):
1. Evaluación determinista en tiempo real (Costo $0 tokens).
2. Noise Filter de Confluencia Institucional:
   - ZAP Oferta: Precio en rango [R1, R2] + BSL swept == True + distancia a dPOC > 0
   - ZAP Demanda: Precio en rango [S1, S2] + SSL swept == True + distancia a dPOC > 0
3. Cooldown Atómico en PostgreSQL (RPC acquire_signal_cooldown) con fallback local seguro.
4. Despacho HTTP con Contrato de Datos Versionado (schema_version: "1.0.0").
5. Mecanismo de red con 1 reintento y 500ms de backoff ante fallas transitorias.
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
MACRO_SNAPSHOT_PATH = os.path.join(ROOT_DIR, 'src', 'data', 'macro_liquidity_snapshot.json')

COOLDOWN_MINUTES = 15
COOLDOWN_SECONDS = COOLDOWN_MINUTES * 60

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

def is_on_cooldown_local(symbol: str) -> bool:
    """Verifica si el activo aún está en ventana de cooldown de 15 minutos (Fallback local)."""
    last_time = _sentinel_state.get('last_triggers', {}).get(symbol, 0)
    return (time.time() - last_time) < COOLDOWN_SECONDS

def set_cooldown_local(symbol: str, timestamp: float):
    """Actualiza y persiste el timestamp del último disparo del activo en disco local."""
    if 'last_triggers' not in _sentinel_state:
        _sentinel_state['last_triggers'] = {}
    _sentinel_state['last_triggers'][symbol] = timestamp
    _save_persisted_state()

def acquire_cooldown_atomic(
    symbol: str,
    setup_type: str,
    event_id: str,
    supabase_url: str,
    supabase_key: str,
    cooldown_minutes: int = COOLDOWN_MINUTES
) -> bool:
    """
    Intenta adquirir cooldown de forma atómica en PostgreSQL vía RPC 'acquire_signal_cooldown'.
    Retorna True si fue adquirido exitosamente, False si está activo en cooldown.
    Si la BD no responde o no tiene la tabla aún, degrada elegantemente a fallback local.
    """
    if not supabase_url or not supabase_key:
        # Modo offline / sin credenciales: usar fallback local
        if is_on_cooldown_local(symbol):
            return False
        set_cooldown_local(symbol, time.time())
        return True

    rpc_url = f"{supabase_url.rstrip('/')}/rest/v1/rpc/acquire_signal_cooldown"
    rpc_payload = json.dumps({
        "p_asset": symbol,
        "p_setup_type": setup_type,
        "p_event_id": event_id,
        "p_cooldown_minutes": cooldown_minutes
    }).encode('utf-8')

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(rpc_url, data=rpc_payload, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            if resp.getcode() == 200:
                result = json.loads(resp.read().decode('utf-8'))
                # True -> Adquirido con éxito; False -> Cooldown aún vigente
                if isinstance(result, bool):
                    if result:
                        set_cooldown_local(symbol, time.time())
                    return result
    except urllib.error.HTTPError as e:
        # Si el RPC no existe aún (404), usar fallback local sin interrumpir
        pass
    except Exception:
        pass

    # Fallback local de seguridad ante timeout de BD
    if is_on_cooldown_local(symbol):
        return False
    set_cooldown_local(symbol, time.time())
    return True

def _get_macro_trends() -> tuple:
    """Extrae tendencias actuales de DXY y US10Y desde el snapshot macro institucional."""
    dxy_trend = "neutral"
    us10y_trend = "neutral"
    if os.path.exists(MACRO_SNAPSHOT_PATH):
        try:
            with open(MACRO_SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
                records = json.load(f)
                if isinstance(records, list):
                    for r in records:
                        sym = r.get('symbol')
                        bias = str(r.get('impact_bias', '')).upper()
                        pct = float(r.get('change_24h_pct', 0.0))
                        
                        if sym == 'US10Y':
                            if pct > 0.5 or bias == 'RESTRICTIVE':
                                us10y_trend = "bullish"
                            elif pct < -0.5 or bias == 'EXPANSIVE':
                                us10y_trend = "bearish"
                        elif sym in ('DXY', 'USDX'):
                            if pct > 0.15 or bias == 'RESTRICTIVE':
                                dxy_trend = "bullish"
                            elif pct < -0.15 or bias == 'EXPANSIVE':
                                dxy_trend = "bearish"
        except Exception:
            pass
    return dxy_trend, us10y_trend

def build_event_payload(
    symbol: str,
    live_price: float,
    quant_record: Dict[str, Any],
    poi: Dict[str, Any],
    bsl_swept: bool,
    ssl_swept: bool,
    pools: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Construye el contrato formal de datos versionado (schema_version: "1.0.0")
    para el orquestador del Sistema Multi-Agente (MAS) en Supabase Edge Function.
    """
    now_utc = datetime.now(timezone.utc)
    dpoc = float(quant_record.get('dpoc_price', live_price))
    vwap = float(quant_record.get('session_vwap', live_price))
    p_type = poi.get('type', 'UNKNOWN_POI')
    trigger_type = "ZAP_SUPPLY_SWEEP" if p_type == 'SELLSIDE_POI' else "ZAP_DEMAND_SWEEP"

    # Bucket de tiempo para idempotencia determinista
    time_bucket = now_utc.strftime('%Y%m%d_%H%M')
    setup_slug = trigger_type.lower()
    evt_id = f"evt_{symbol.lower()}_{setup_slug}_{time_bucket}"

    # Distancia en pips / unidades relativas
    raw_dist = abs(live_price - dpoc)
    if 'JPY' in symbol:
        pips_dist = round(raw_dist * 100, 1)
    elif live_price < 10.0:
        pips_dist = round(raw_dist * 10000, 1)
    else:
        pips_dist = round(raw_dist, 2)

    ssl_pools_list = pools.get('ssl', []) if isinstance(pools, dict) else []
    if ssl_swept:
        ssl_status = "swept"
    elif any(p.get('status') == 'pending' for p in ssl_pools_list if isinstance(p, dict)):
        ssl_status = "pending"
    else:
        ssl_status = "untouched"

    dxy_trend, us10y_trend = _get_macro_trends()
    shadow_mode = os.getenv("AEON_SHADOW_MODE", "false").lower() in ("true", "1", "yes")

    # Contrato Versionado Estricto v1.0.0
    return {
        "schema_version": "1.0.0",
        "event_id": evt_id,
        "asset": symbol,
        "symbol": symbol,
        "session": quant_record.get('session_origin', 'new_york').lower(),
        "timestamp": now_utc.isoformat(),
        "trigger_source": "python_engine",
        "trigger_type": trigger_type,
        "current_price": live_price,
        "display_name": quant_record.get('display_name', symbol),
        "shadow_mode": shadow_mode,

        "deterministic_inputs": {
            "zap_price_range": [float(poi.get('range_low', live_price)), float(poi.get('range_high', live_price))],
            "dpoc": dpoc,
            "vwap": vwap,
            "current_price": live_price,
            "liquidity_state": {
                "bsl_swept": bool(bsl_swept),
                "ssl_status": ssl_status
            },
            "macro_driver": str(quant_record.get('macro_driver', 'Estructura cuantitativa activa.')),
            "dxy_trend": dxy_trend,
            "us10y_trend": us10y_trend,
            "ema50_slope": str(quant_record.get('ema50_slope', 'plano')).lower(),
            "daily_briefing_bias": str(quant_record.get('bias', 'neutral')).lower()
        },

        # Compatibilidad backward con el consumidor actual del frontend
        "market_data": {
            "current_price": live_price,
            "session_active": quant_record.get('session_origin', 'GLOBAL'),
            "structural_zone": poi.get('zone_label', p_type),
            "zap_price_range": [poi.get('range_low', live_price), poi.get('range_high', live_price)],
            "dpoc_price": dpoc,
            "distance_to_dpoc": pips_dist,
            "volume_profile": {
                "dpoc_price": dpoc,
                "dist_dpoc": pips_dist
            },
            "session_vwap": vwap,
            "ema_alignment": "BULLISH_4H_BEARISH_M15" if quant_record.get('bias') == 'BEARISH' else "BEARISH_4H_BULLISH_M15",
            "liquidity_state": {
                "bsl_swept": bsl_swept,
                "ssl_swept": ssl_swept,
                "ssl_status": ssl_status
            },
            "macro_driver": quant_record.get('macro_driver', 'Estructura institucional activa.'),
            "daily_bias": quant_record.get('bias', 'NEUTRAL'),
            "bias_score": quant_record.get('bias_score', 50)
        }
    }

def _dispatch_to_edge_worker(payload: Dict[str, Any], supabase_url: str, supabase_key: str):
    """
    Despachador HTTP directo con 1 reintento y backoff de 500ms ante fallas transitorias.
    Timeout de 4.0s por intento. Se ejecuta en hilo daemon para no bloquear el motor principal.
    """
    if not supabase_url or not supabase_key:
        return

    url = f"{supabase_url.rstrip('/')}/functions/v1/aeon-copilot-event"
    body_bytes = json.dumps(payload).encode('utf-8')
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key,
        "Content-Type": "application/json",
        "User-Agent": "AEON_Autonomous_Sentinel_MAS/1.0.0"
    }

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method='POST')
    
    max_retries = 1
    for attempt in range(max_retries + 1):
        t_str = datetime.now().strftime('%H:%M:%S')
        try:
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                status = resp.getcode()
                resp_body = resp.read().decode('utf-8')
                print(f"[{t_str}] [SENTINEL MAS] 🚀 Alerta Estructural {payload['event_id']} despachada (HTTP {status})", flush=True)
                return
        except urllib.error.HTTPError as e:
            # Si es error 4xx (p.ej. 400 Bad Request o 401 Unauthorized), no reintentar
            err_msg = e.read().decode('utf-8') if e.fp else str(e)
            print(f"[{t_str}] [SENTINEL MAS] ⚠️ Error HTTP {e.code} en intento {attempt + 1}: {err_msg[:120]}", flush=True)
            if e.code < 500:
                return
        except Exception as e:
            print(f"[{t_str}] [SENTINEL MAS] ⚠️ Red no completada ({type(e).__name__}) en intento {attempt + 1}", flush=True)

        if attempt < max_retries:
            time.sleep(0.5)  # Backoff de 500ms

def evaluate_tactical_triggers(
    symbol: str,
    live_price: float,
    quant_record: Dict[str, Any],
    supabase_url: str = '',
    supabase_key: str = ''
) -> Optional[Dict[str, Any]]:
    """
    Evalúa la máquina de estados de confluencia institucional determinista.
    Retorna el payload del evento si se gatilla y se adquiere el cooldown atómico.
    """
    cited = quant_record.get('cited_key_levels')
    if not isinstance(cited, dict):
        return None

    poi_list = cited.get('structural_poi', [])
    pools = cited.get('liquidity_pools', {})
    dpoc = float(quant_record.get('dpoc_price', live_price))

    # 1. Extracción de estado de barrido de piscinas de liquidez
    bsl_pools = pools.get('bsl', []) if isinstance(pools, dict) else []
    ssl_pools = pools.get('ssl', []) if isinstance(pools, dict) else []

    bsl_swept = any(p.get('status') == 'swept' for p in bsl_pools if isinstance(p, dict))
    ssl_swept = any(p.get('status') == 'swept' for p in ssl_pools if isinstance(p, dict))

    # 2. Evaluación de confluencia ZAP + Liquidez + dPOC
    for poi in poi_list:
        if not isinstance(poi, dict):
            continue

        low = float(poi.get('range_low', 0))
        high = float(poi.get('range_high', 0))
        p_type = poi.get('type')

        in_zone = (low <= live_price <= high)
        dist_dpoc = abs(live_price - dpoc)

        is_triggered = False
        setup_type = ""

        # Caso A: ZAP de Oferta (Venta) + Barrido BSL (Altos liquidados) + Alejado de dPOC
        if p_type == 'SELLSIDE_POI' and in_zone and bsl_swept and dist_dpoc > 0:
            is_triggered = True
            setup_type = "ZAP_SUPPLY_SWEEP"

        # Caso B: ZAP de Demanda (Compra) + Barrido SSL (Bajos liquidados) + Alejado de dPOC
        elif p_type == 'BUYSIDE_POI' and in_zone and ssl_swept and dist_dpoc > 0:
            is_triggered = True
            setup_type = "ZAP_DEMAND_SWEEP"

        if is_triggered:
            # 3. Construcción previa del payload para obtener el event_id determinista
            payload = build_event_payload(symbol, live_price, quant_record, poi, bsl_swept, ssl_swept, pools)
            evt_id = payload['event_id']

            # 4. Adquisición atómica de Cooldown en PostgreSQL
            acquired = acquire_cooldown_atomic(
                symbol=symbol,
                setup_type=setup_type,
                event_id=evt_id,
                supabase_url=supabase_url,
                supabase_key=supabase_key,
                cooldown_minutes=COOLDOWN_MINUTES
            )

            if not acquired:
                # Cooldown activo: descarte atómico silencioso
                return None

            # Guardar en historial local de eventos para observabilidad
            if 'dispatched_events' not in _sentinel_state:
                _sentinel_state['dispatched_events'] = []
            _sentinel_state['dispatched_events'].append({
                'event_id': evt_id,
                'symbol': symbol,
                'price': live_price,
                'trigger_type': setup_type,
                'timestamp': payload['timestamp']
            })
            _sentinel_state['dispatched_events'] = _sentinel_state['dispatched_events'][-20:]
            _save_persisted_state()

            # 5. Despacho Asíncrono en Hilo Daemon
            t = threading.Thread(
                target=_dispatch_to_edge_worker,
                args=(payload, supabase_url, supabase_key),
                daemon=True,
                name=f"HarnessDispatch_{symbol}"
            )
            t.start()

            return payload

    return None
