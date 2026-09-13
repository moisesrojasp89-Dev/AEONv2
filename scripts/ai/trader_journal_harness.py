#!/usr/bin/env python3
"""
AEON Trader Journal Harness & Conversational Copilot Engine (MAS v1.2.0)
=============================================================================
Arquitectura de Harness Engineering con:
1. Validación de coherencia direccional pre-INSERT (BUY: SL < Entry < TP | SELL: TP < Entry < SL)
2. Parseo determinista de intenciones (LOG_TRADE, CLOSE_TRADE, CANCEL_TRADE, AUDIT)
3. Desambiguación de órdenes multi-posición (sin adivinación silenciosa)
4. Congelador inmutable de telemetría cuántica (Zero-Trust Snapshot)
5. Matemática estricta y bifurcada de MFE/MAE por direction
6. Anti-Advisor Guardrail (Esquema estricto + Denylist secundario)
7. Evaluator Agent para auditoría post-mortem semanal (Excluye CANCELLED)
=============================================================================
"""

import re
import math
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

# -----------------------------------------------------------------------------
# 1. VALIDACIÓN DE COHERENCIA DIRECCIONAL PRE-INSERT
# -----------------------------------------------------------------------------
def validate_trade_coherence(direction: str, entry: float, sl: float, tp: float) -> Tuple[bool, str]:
    """
    Verifica que los niveles de precios sean matemáticamente coherentes con la dirección.
    Evita que un ABS() enmascare errores como un BUY con SL por encima de la entrada.
    """
    direction = direction.upper().strip()
    if direction not in ("BUY", "SELL"):
        return False, f"Dirección inválida '{direction}'. Solo se admite 'BUY' o 'SELL'."
    
    if entry <= 0 or sl <= 0 or tp <= 0:
        return False, "Los niveles de precio (Entrada, SL, TP) deben ser estrictamente positivos."
        
    if direction == "BUY":
        if not (sl < entry < tp):
            return False, (
                f"Incoherencia en COMPRA (BUY): El Stop Loss ({sl}) debe estar estrictamente "
                f"por debajo de la Entrada ({entry}), y el Take Profit ({tp}) por encima."
            )
    elif direction == "SELL":
        if not (tp < entry < sl):
            return False, (
                f"Incoherencia en VENTA (SELL): El Take Profit ({tp}) debe estar estrictamente "
                f"por debajo de la Entrada ({entry}), y el Stop Loss ({sl}) por encima."
            )
            
    return True, "OK"


# -----------------------------------------------------------------------------
# 2. PARSER DETERMINISTA DE INTENCIONES CONVERSACIONALES
# -----------------------------------------------------------------------------
# Expresiones regulares para extracción de datos cuantitativos
RE_SYMBOL = re.compile(r'\b(XAUUSD|EURUSD|GBPUSD|BTCUSD|US500|NAS100|ORO|GOLD|BITCOIN|ETHUSD)\b', re.IGNORECASE)
RE_BUY = re.compile(r'\b(compr[eéóar]?|long|largo|entr[eéó]\s+en\s+compra|buy)\b', re.IGNORECASE)
RE_SELL = re.compile(r'\b(vend[eíóar]?|short|corto|entr[eéó]\s+en\s+venta|sell)\b', re.IGNORECASE)

# Extracción de precios
RE_ENTRY = re.compile(r'(?:en|entrada|precio|entry)[\s:=]+([0-9]+(?:\.[0-9]+)?)', re.IGNORECASE)
RE_SL = re.compile(r'(?:sl|stop|stop\s*loss)[\s:=]+([0-9]+(?:\.[0-9]+)?)', re.IGNORECASE)
RE_TP = re.compile(r'(?:tp|target|take\s*profit)[\s:=]+([0-9]+(?:\.[0-9]+)?)', re.IGNORECASE)

# Extracción de cierre y anulación
RE_CLOSE_INTENT = re.compile(r'\b(cerr[eéóar]?|toqu[eéó]|toc[oó]\s+tp|toc[oó]\s+sl|sal[íió]|liquid[eéóar]?)\b', re.IGNORECASE)
RE_CANCEL_INTENT = re.compile(r'\b(anul[eéóar]?|cancel[eéóar]?|borr[eéóar]?|elimin[eéóar]?|descarta?r?)\b', re.IGNORECASE)
RE_LAST_TRADE = re.compile(r'\b(mi\s+)?(último|ultimo)\s+(trade|orden|posici[oó]n)?\b', re.IGNORECASE)
RE_AUDIT_INTENT = re.compile(r'\b(auditor[íi]a|reporte|an[aá]lisis|resumen)\s+(semanal|de\s+mis\s+trades|de\s+la\s+semana)\b', re.IGNORECASE)

SYMBOL_MAP = {
    "ORO": "XAUUSD",
    "GOLD": "XAUUSD",
    "BITCOIN": "BTCUSD"
}

def parse_trade_intent(user_text: str) -> Dict[str, Any]:
    """
    Parsea la intención del trader desde lenguaje natural de forma determinista.
    Retorna el tipo de acción y parámetros extraídos.
    """
    text = user_text.strip()
    
    # 1. Detección de solicitud de auditoría semanal
    if RE_AUDIT_INTENT.search(text):
        return {
            "action": "REQUEST_AUDIT",
            "raw_text": text
        }
        
    # 2. Detección de intención de anulación/cancelación
    if RE_CANCEL_INTENT.search(text):
        symbol_match = RE_SYMBOL.search(text)
        symbol = symbol_match.group(1).upper() if symbol_match else None
        if symbol in SYMBOL_MAP:
            symbol = SYMBOL_MAP[symbol]
            
        is_last = bool(RE_LAST_TRADE.search(text))
        
        # Extracción de ID corto si lo menciona (ej. #TJ-9102 o 9102)
        id_match = re.search(r'#?([a-f0-9\-]{4,36})\b', text, re.IGNORECASE)
        trade_id = id_match.group(1) if id_match and not symbol_match else None
        
        return {
            "action": "CANCEL_TRADE",
            "symbol": symbol,
            "is_last_trade": is_last,
            "trade_id": trade_id,
            "raw_text": text
        }

    # 3. Detección de intención de cierre de trade
    if RE_CLOSE_INTENT.search(text):
        symbol_match = RE_SYMBOL.search(text)
        symbol = symbol_match.group(1).upper() if symbol_match else None
        if symbol in SYMBOL_MAP:
            symbol = SYMBOL_MAP[symbol]
            
        is_last = bool(RE_LAST_TRADE.search(text))
        
        # Precio de salida
        exit_price_match = re.search(r'(?:en|a|precio)[\s:=]+([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE)
        exit_price = float(exit_price_match.group(1)) if exit_price_match else None
        
        # Razón de salida
        exit_reason = "MANUAL_EXIT"
        if re.search(r'\btp\b|take\s*profit', text, re.IGNORECASE):
            exit_reason = "TP_HIT"
        elif re.search(r'\bsl\b|stop\s*loss', text, re.IGNORECASE):
            exit_reason = "SL_HIT"
        elif re.search(r'\bbe\b|breakeven|break\s*even', text, re.IGNORECASE):
            exit_reason = "BREAK_EVEN"
            
        return {
            "action": "CLOSE_TRADE",
            "symbol": symbol,
            "is_last_trade": is_last,
            "exit_price": exit_price,
            "exit_reason": exit_reason,
            "raw_text": text
        }

    # 4. Detección de intención de registro de nuevo trade
    is_buy = bool(RE_BUY.search(text))
    is_sell = bool(RE_SELL.search(text))
    
    if is_buy or is_sell:
        direction = "BUY" if is_buy else "SELL"
        symbol_match = RE_SYMBOL.search(text)
        symbol = symbol_match.group(1).upper() if symbol_match else None
        if symbol in SYMBOL_MAP:
            symbol = SYMBOL_MAP[symbol]
            
        entry_match = RE_ENTRY.search(text)
        sl_match = RE_SL.search(text)
        tp_match = RE_TP.search(text)
        
        # Extracción fallback si no usó etiquetas explícitas
        # ej. "Compré XAUUSD 2650 sl 2642 tp 2668"
        entry_val = float(entry_match.group(1)) if entry_match else None
        sl_val = float(sl_match.group(1)) if sl_match else None
        tp_val = float(tp_match.group(1)) if tp_match else None
        
        if not entry_val:
            numbers = [float(n) for n in re.findall(r'\b([0-9]+(?:\.[0-9]+)?)\b', text)]
            if len(numbers) >= 3:
                entry_val = numbers[0]
                sl_val = numbers[1]
                tp_val = numbers[2]

        return {
            "action": "LOG_TRADE",
            "symbol": symbol,
            "direction": direction,
            "entry_price": entry_val,
            "stop_loss": sl_val,
            "take_profit": tp_val,
            "raw_text": text
        }

    return {
        "action": "GENERAL_CONSULTATION",
        "raw_text": text
    }


# -----------------------------------------------------------------------------
# 3. MOTOR DE DESAMBIGUACIÓN DE ÓRDENES
# -----------------------------------------------------------------------------
def disambiguate_trade(
    open_trades: List[Dict[str, Any]], 
    symbol: Optional[str] = None, 
    is_last_trade: bool = False,
    trade_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Resuelve qué trade operar sin adivinación silenciosa:
    - Si 'is_last_trade' es True: retorna el trade más reciente (unívoco por definición).
    - Si hay trade_id: busca coincidencia exacta o por prefijo UUID.
    - Si se especifica símbolo:
      * Si hay 1 coincidencia: retorna esa posición.
      * Si hay > 1 coincidencias: FRENA y pide aclaración con opciones detalladas.
      * Si hay 0 coincidencias: retorna error descriptivo.
    """
    if not open_trades:
        return {
            "status": "NOT_FOUND",
            "message": "No tienes ninguna posición abierta registrada en tu diario."
        }
        
    # Caso 1: Referencia unívoca al último trade
    if is_last_trade:
        # Ordenar por timestamp descendente
        sorted_trades = sorted(
            open_trades, 
            key=lambda t: t.get("entry_timestamp", ""), 
            reverse=True
        )
        return {
            "status": "OK",
            "trade": sorted_trades[0],
            "reason": "LAST_TRADE_MATCH"
        }
        
    # Caso 2: Referencia por ID
    if trade_id:
        matches = [t for t in open_trades if str(t.get("id", "")).startswith(trade_id)]
        if len(matches) == 1:
            return {"status": "OK", "trade": matches[0], "reason": "ID_EXACT_MATCH"}
        elif len(matches) > 1:
            return {
                "status": "AMBIGUOUS",
                "message": f"El ID '{trade_id}' coincide con múltiples posiciones. Por favor especifica más caracteres.",
                "candidates": matches
            }
            
    # Caso 3: Referencia por símbolo
    if symbol:
        matches = [t for t in open_trades if t.get("symbol", "").upper() == symbol.upper()]
        if len(matches) == 0:
            return {
                "status": "NOT_FOUND",
                "message": f"No se encontraron posiciones abiertas para el activo {symbol}."
            }
        elif len(matches) == 1:
            return {
                "status": "OK",
                "trade": matches[0],
                "reason": "SINGLE_SYMBOL_MATCH"
            }
        else:
            # Más de una posición abierta en el mismo símbolo (Regla de oro del Arquitecto: NO ADIVINAR)
            options = []
            for t in matches:
                short_id = str(t.get("id", ""))[:8]
                options.append(f"• ID #{short_id} — {t.get('direction')} en {t.get('entry_price')} (SL: {t.get('stop_loss')}, TP: {t.get('take_profit')})")
            
            return {
                "status": "AMBIGUOUS",
                "message": (
                    f"Tienes {len(matches)} posiciones abiertas en {symbol}. Para evitar actuar sobre la posición incorrecta, "
                    f"por favor especifica cuál deseas operar indicando el precio de entrada o ID:\n" + "\n".join(options)
                ),
                "candidates": matches
            }

    # Sin criterio suficiente
    return {
        "status": "AMBIGUOUS",
        "message": "Por favor indica el símbolo del trade (ej. XAUUSD) o di 'mi último trade'."
    }


# -----------------------------------------------------------------------------
# 4. CONGELADOR DE TELEMETRÍA CUÁNTICA (ZERO-TRUST SNAPSHOT)
# -----------------------------------------------------------------------------
def freeze_quantum_snapshot(symbol: str, active_market_snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """
    Captura una fotografía inmutable de los datos de mercado en el momento exacto
    de la entrada del trade. Esta información queda sellada con service_role.
    """
    asset_data = {}
    if "data" in active_market_snapshot and isinstance(active_market_snapshot["data"], list):
        for item in active_market_snapshot["data"]:
            if item.get("symbol") == symbol:
                asset_data = item
                break
    elif active_market_snapshot.get("symbol") == symbol:
        asset_data = active_market_snapshot

    technical = asset_data.get("technical_thesis", {})
    structural = asset_data.get("structural_scenarios", {})

    return {
        "snapshot_timestamp": datetime.now(timezone.utc).isoformat(),
        "market_price": asset_data.get("current_price", 0.0),
        "dpoc_price": asset_data.get("dpoc_price", 0.0),
        "session_vwap": asset_data.get("session_vwap", 0.0),
        "system_bias": asset_data.get("bias", "NEUTRAL"),
        "system_bias_score": asset_data.get("bias_score", 50),
        "confluences": asset_data.get("catalyst_tags", []),
        "invalidation_level": structural.get("invalidation_level", None),
        "invalidation_text": structural.get("invalidation_text", ""),
        "macro_driver": asset_data.get("macro_driver", "Mercado en régimen normal")
    }


# -----------------------------------------------------------------------------
# 5. MATEMÁTICA DE EXCURSIÓN MFE / MAE (BIFURCACIÓN ESTRICTA POR DIRECTION)
# -----------------------------------------------------------------------------
def calculate_trade_excursion(
    direction: str,
    entry_price: float,
    stop_loss: float,
    tick_price: float,
    current_mfe_r: float = 0.0,
    current_mae_r: float = 0.0
) -> Tuple[float, float, float]:
    """
    Calcula MFE (Excursión Favorable Máxima) y MAE (Excursión Adversa Máxima / Drawdown)
    normalizados en múltiplos de R.
    
    Bifurcación estricta por dirección (Punto 3 del Arquitecto):
    - BUY:  current_r = (tick - entry) / (entry - sl)
    - SELL: current_r = (entry - tick) / (sl - entry)
    
    Retorna: (new_mfe_r, new_mae_r, current_r)
    """
    direction = direction.upper().strip()
    
    if direction == "BUY":
        r_dist = entry_price - stop_loss
        if r_dist <= 0:
            return current_mfe_r, current_mae_r, 0.0
        current_r = (tick_price - entry_price) / r_dist
    elif direction == "SELL":
        r_dist = stop_loss - entry_price
        if r_dist <= 0:
            return current_mfe_r, current_mae_r, 0.0
        current_r = (entry_price - tick_price) / r_dist
    else:
        return current_mfe_r, current_mae_r, 0.0

    # Redondear a 2 decimales
    current_r = round(current_r, 2)
    new_mfe_r = round(max(float(current_mfe_r), current_r), 2)
    new_mae_r = round(min(float(current_mae_r), current_r), 2)
    
    return new_mfe_r, new_mae_r, current_r


def calculate_realized_pnl(direction: str, entry_price: float, stop_loss: float, exit_price: float) -> Tuple[float, float]:
    """
    Calcula los puntos reales y múltiplos de R realizados al cierre.
    """
    direction = direction.upper().strip()
    if direction == "BUY":
        pnl_pts = exit_price - entry_price
        r_dist = entry_price - stop_loss
    else: # SELL
        pnl_pts = entry_price - exit_price
        r_dist = stop_loss - entry_price
        
    pnl_pts = round(pnl_pts, 4)
    realized_rr = round(pnl_pts / r_dist, 2) if r_dist > 0 else 0.00
    return pnl_pts, realized_rr


# -----------------------------------------------------------------------------
# 6. ANTI-ADVISOR GUARDRAIL (SCHEMA TOOL + DENYLIST SECUNDARIO)
# -----------------------------------------------------------------------------
DENYLIST_ADVICE_PATTERNS = [
    re.compile(r'\b(te\s+recomiendo|te\s+sugiero|te\s+aconsejo)\b', re.IGNORECASE),
    re.compile(r'\b(deber[íi]as\s+cerrar|deber[íi]as\s+comprar|deber[íi]as\s+vender)\b', re.IGNORECASE),
    re.compile(r'\b(entra\s+ya|compra\s+ahora|vende\s+ahora|sal\s+ahora)\b', re.IGNORECASE),
    re.compile(r'\b(duplica\s+el\s+lote|sube\s+el\s+lote|apalancate|m[aá]x[ií]mo\s+apalancamiento)\b', re.IGNORECASE),
    re.compile(r'\b(oportunidad\s+imperdible|ganancia\s+garantizada|seguro\s+se\s+da)\b', re.IGNORECASE)
]

def sanitize_anti_advisor(text: str) -> Tuple[bool, str]:
    """
    Verifica que el texto generado no contenga recomendaciones prescriptivas o financieras.
    Si se detecta una violación, la neutraliza a lectura de microestructura cuantitativa.
    """
    violates = False
    clean_text = text
    for pattern in DENYLIST_ADVICE_PATTERNS:
        if pattern.search(clean_text):
            violates = True
            clean_text = pattern.sub("[INFORMACIÓN CUANTITATIVA DISPONIBLE]", clean_text)
            
    return violates, clean_text


# -----------------------------------------------------------------------------
# 7. AGENTE EVALUADOR POST-MORTEM (AUDITORÍA SEMANAL)
# -----------------------------------------------------------------------------
def run_weekly_trader_audit(closed_trades: List[Dict[str, Any]], week_start: str, week_end: str) -> Dict[str, Any]:
    """
    Ejecuta el análisis objetivo de desempeño del trader en la semana:
    - Excluye estrictamente trades CANCELLED y OPEN.
    - Computa Win Rate, Retorno Neto R, Factor de Ganancia y Drawdown promedio (MAE).
    - Evalúa la disciplina confluente contra el dPOC y el respeto de ratios R:R.
    """
    # Filtro estricto: solo CLOSED
    valid_trades = [t for t in closed_trades if t.get("status") == "CLOSED"]
    
    total = len(valid_trades)
    if total == 0:
        return {
            "week_start_date": week_start,
            "week_end_date": week_end,
            "total_trades_logged": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "breakeven_trades": 0,
            "win_rate_pct": 0.00,
            "net_pnl_r": 0.00,
            "profit_factor_rr": 0.00,
            "average_mae_r": 0.00,
            "average_mfe_r": 0.00,
            "dpoc_confluence_pct": 0.00,
            "risk_discipline_pct": 0.00,
            "audit_findings": {
                "verdict": "Sin trades ejecutados ni cerrados en el período solicitado.",
                "recommendation": "Registra tus operaciones activas con el Copilot para auditar tu disciplina."
            },
            "markdown_summary": "### Auditoría Cuántica Semanal\nNo se registraron operaciones cerradas en esta semana."
        }
        
    wins = [t for t in valid_trades if float(t.get("realized_rr") or 0.0) > 0]
    losses = [t for t in valid_trades if float(t.get("realized_rr") or 0.0) < 0]
    bes = [t for t in valid_trades if float(t.get("realized_rr") or 0.0) == 0]
    
    win_rate = round((len(wins) / total) * 100, 2)
    net_pnl_r = round(sum(float(t.get("realized_rr") or 0.0) for t in valid_trades), 2)
    
    gross_win = sum(float(t.get("realized_rr") or 0.0) for t in wins)
    gross_loss = abs(sum(float(t.get("realized_rr") or 0.0) for t in losses))
    profit_factor = round(gross_win / gross_loss, 2) if gross_loss > 0 else (99.99 if gross_win > 0 else 0.00)
    
    avg_mae = round(sum(float(t.get("mae_r") or 0.0) for t in valid_trades) / total, 2)
    avg_mfe = round(sum(float(t.get("mfe_r") or 0.0) for t in valid_trades) / total, 2)
    
    # Análisis de confluencias cuánticas
    dpoc_aligned = 0
    risk_disciplined = 0
    for t in valid_trades:
        # planned R:R >= 1.5
        if float(t.get("planned_rr_ratio") or 0.0) >= 1.50:
            risk_disciplined += 1
            
        # Confluencia con dPOC en el momento de la entrada
        ctx = t.get("quantum_context_at_entry", {})
        dpoc_price = float(ctx.get("dpoc_price") or 0.0)
        entry = float(t.get("entry_price") or 0.0)
        direction = t.get("direction")
        
        if dpoc_price > 0:
            # En compra, entrar cerca o por encima de dPOC se considera alineado
            if direction == "BUY" and (entry >= dpoc_price * 0.998):
                dpoc_aligned += 1
            elif direction == "SELL" and (entry <= dpoc_price * 1.002):
                dpoc_aligned += 1
                
    dpoc_confluence_pct = round((dpoc_aligned / total) * 100, 2)
    risk_discipline_pct = round((risk_disciplined / total) * 100, 2)
    
    # Diagnóstico del Evaluator
    findings = {
        "primary_success_factor": "Alta disciplina en R:R planificado" if risk_discipline_pct >= 80 else "Revisar filtros de entrada",
        "drawdown_vulnerability": "Bajo control" if avg_mae > -0.70 else f"Drawdown promedio elevado ({avg_mae}R). Evalúa entradas más precisas.",
        "dpoc_discipline_status": "Excelente alineación con volumen institucional" if dpoc_confluence_pct >= 75 else "Atención: varias operaciones tomadas contra el flujo del dPOC.",
        "verdict": f"Semana finalizada con {net_pnl_r:+0.2f}R y {win_rate}% Win Rate sobre {total} trades."
    }
    
    md_summary = f"""### 📊 Auditoría Cuántica Semanal ({week_start} al {week_end})
• **Trades Cerrados:** {total} ({len(wins)}W | {len(losses)}L | {len(bes)}BE) — **Win Rate:** {win_rate}%
• **Resultado Neto:** **{net_pnl_r:+0.2f} R** | **Profit Factor:** {profit_factor}
• **Excursión Media:** MFE promedio: +{avg_mfe:0.2f}R | Drawdown (MAE) promedio: {avg_mae:0.2f}R

**Métricas de Disciplina Institucional:**
• **Disciplina dPOC:** {dpoc_confluence_pct}% de operaciones confluentes con el valor de mercado.
• **Disciplina de Riesgo:** {risk_discipline_pct}% de operaciones con R:R planificado ≥ 1.5:1.
• **Diagnóstico:** {findings['dpoc_discipline_status']}
"""

    return {
        "week_start_date": week_start,
        "week_end_date": week_end,
        "total_trades_logged": total,
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "breakeven_trades": len(bes),
        "win_rate_pct": win_rate,
        "net_pnl_r": net_pnl_r,
        "profit_factor_rr": profit_factor,
        "average_mae_r": avg_mae,
        "average_mfe_r": avg_mfe,
        "dpoc_confluence_pct": dpoc_confluence_pct,
        "risk_discipline_pct": risk_discipline_pct,
        "audit_findings": findings,
        "markdown_summary": md_summary.strip()
    }


# -----------------------------------------------------------------------------
# 8. RATCHET DE 20s PARA TRADES OPEN EN VPS
# -----------------------------------------------------------------------------
def evaluate_trader_journal_ratchet(
    prices_cache: Dict[str, float],
    supabase_url: str,
    supabase_key: str
) -> int:
    """
    Worker que corre cada 20s en el VPS.
    1. Refresca dinámicamente las posiciones con status='OPEN' desde Supabase (sub-2ms).
    2. Calcula MFE y MAE bifurcados por direction.
    3. Si cambian, actualiza atómicamente con WHERE id = :id AND status = 'OPEN'.
       Si el trade ya cerró, el UPDATE afecta 0 filas (condición de carrera prevenida).
    Retorna el número de posiciones actualizadas.
    """
    if not supabase_url or not supabase_key or not prices_cache:
        return 0
        
    import urllib.request
    import json
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    # 1. Fetch de posiciones abiertas
    url_get = f"{supabase_url.rstrip('/')}/rest/v1/trader_journal?status=eq.OPEN&select=id,symbol,direction,entry_price,stop_loss,mfe_r,mae_r"
    try:
        req = urllib.request.Request(url_get, headers=headers)
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            open_trades = json.loads(resp.read().decode('utf-8'))
    except Exception:
        return 0
        
    if not open_trades:
        return 0
        
    updated_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    
    for trade in open_trades:
        sym = trade.get("symbol")
        curr_price = prices_cache.get(sym)
        if curr_price is None:
            continue
            
        direction = trade.get("direction", "BUY")
        entry = float(trade.get("entry_price") or 0.0)
        sl = float(trade.get("stop_loss") or 0.0)
        curr_mfe = float(trade.get("mfe_r") or 0.0)
        curr_mae = float(trade.get("mae_r") or 0.0)
        
        new_mfe, new_mae, _ = calculate_trade_excursion(
            direction=direction,
            entry_price=entry,
            stop_loss=sl,
            tick_price=curr_price,
            current_mfe_r=curr_mfe,
            current_mae_r=curr_mae
        )
        
        if new_mfe > curr_mfe or new_mae < curr_mae:
            # Actualización atómica con filtro status='OPEN'
            url_patch = f"{supabase_url.rstrip('/')}/rest/v1/trader_journal?id=eq.{trade['id']}&status=eq.OPEN"
            payload = {
                "mfe_r": new_mfe,
                "mae_r": new_mae,
                "updated_at": now_iso
            }
            try:
                patch_req = urllib.request.Request(
                    url_patch,
                    data=json.dumps(payload).encode('utf-8'),
                    headers=headers,
                    method='PATCH'
                )
                with urllib.request.urlopen(patch_req, timeout=3.0) as p_resp:
                    updated_count += 1
            except Exception:
                pass
                
    return updated_count

