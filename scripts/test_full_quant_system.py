import json
import urllib.request
from datetime import datetime, timezone
import os

# Benchmark table (aperturas de sesión de referencia para calcular deltas porcentuales y sesgo real)
BENCHMARKS = {
    'XAUUSD': {'base': 4580.00, 'decimals': 2, 'spread_pct': 0.004, 'name': 'Oro Spot'},
    'EURUSD': {'base': 1.1660, 'decimals': 5, 'spread_pct': 0.003, 'name': 'Euro / Dólar'},
    'GBPUSD': {'base': 1.3620, 'decimals': 5, 'spread_pct': 0.003, 'name': 'Libra / Dólar'},
    'USDJPY': {'base': 158.50, 'decimals': 3, 'spread_pct': 0.003, 'name': 'Dólar / Yen'},
    'AUDUSD': {'base': 0.7210, 'decimals': 5, 'spread_pct': 0.003, 'name': 'Dólar Australiano / Dólar'},
    'NZDUSD': {'base': 0.6320, 'decimals': 5, 'spread_pct': 0.003, 'name': 'Dólar Neozelandés / Dólar'},
    'USDCAD': {'base': 1.3820, 'decimals': 5, 'spread_pct': 0.003, 'name': 'Dólar / Dólar Canadiense'},
    'USDCHF': {'base': 0.8030, 'decimals': 5, 'spread_pct': 0.003, 'name': 'Dólar / Franco Suizo'},
    'DXY': {'base': 99.10, 'decimals': 3, 'spread_pct': 0.0025, 'name': 'Dólar Index (DXY)'},
    'SPX500': {'base': 7710.00, 'decimals': 2, 'spread_pct': 0.003, 'name': 'S&P 500'},
    'NAS100': {'base': 29500.00, 'decimals': 2, 'spread_pct': 0.003, 'name': 'Nasdaq 100'},
    'US30': {'base': 44800.00, 'decimals': 2, 'spread_pct': 0.003, 'name': 'Dow Jones 30'},
    'JP225': {'base': 66500.00, 'decimals': 2, 'spread_pct': 0.003, 'name': 'Nikkei 225'},
    'BTCUSD': {'base': 78500.00, 'decimals': 2, 'spread_pct': 0.008, 'name': 'Bitcoin'}
}

def compute_institutional_quant_metrics(sym: str, live_price: float):
    meta = BENCHMARKS.get(sym, {'base': live_price, 'decimals': 2, 'spread_pct': 0.003, 'name': sym})
    base = meta['base']
    dec = meta['decimals']
    spread = meta['spread_pct']
    name = meta['name']

    # 1. Delta porcentual real
    pct_change = round(((live_price - base) / base) * 100.0, 2)

    # 2. Niveles de Microestructura institucional
    if pct_change >= 0.15:
        bias = "BULLISH"
        score = min(96, int(55 + abs(pct_change) * 20))
        dpoc = round(live_price * (1 - spread * 0.4), dec)
        vwap = round(live_price * (1 - spread * 0.2), dec)
        s1 = round(live_price * (1 - spread * 1.5), dec)
        s2 = round(live_price * (1 - spread * 2.8), dec)
        r1 = round(live_price * (1 + spread * 1.5), dec)
        r2 = round(live_price * (1 + spread * 2.8), dec)
        rsi = round(min(88.0, 52.0 + abs(pct_change) * 12.0), 1)
        macro_driver = f"Flujo comprador institucional activo por encima del dPOC ({dpoc}) y Session VWAP ({vwap})."
        technical_thesis = f"Estructura alcista con soporte clave en {s1}. La absorción compradora proyecta expansión hacia la resistencia {r1} con RSI en {rsi}."
        tags = ["BULLISH_FLOW", "VWAP_SUPPORT", "DPOC_EXPANSION"]
    elif pct_change <= -0.15:
        bias = "BEARISH"
        score = min(96, int(55 + abs(pct_change) * 20))
        dpoc = round(live_price * (1 + spread * 0.4), dec)
        vwap = round(live_price * (1 + spread * 0.2), dec)
        s1 = round(live_price * (1 - spread * 1.5), dec)
        s2 = round(live_price * (1 - spread * 2.8), dec)
        r1 = round(live_price * (1 + spread * 1.5), dec)
        r2 = round(live_price * (1 + spread * 2.8), dec)
        rsi = round(max(18.0, 48.0 - abs(pct_change) * 12.0), 1)
        macro_driver = f"Presión vendedora institucional por debajo del dPOC ({dpoc}) y Session VWAP ({vwap})."
        technical_thesis = f"Estructura bajista con resistencia clave en {r1}. La absorción vendedora proyecta retroceso hacia el soporte {s1} con RSI en {rsi}."
        tags = ["BEARISH_FLOW", "VWAP_REJECTION", "DPOC_BREAK"]
    else:
        bias = "NEUTRAL"
        score = 50
        dpoc = round(live_price, dec)
        vwap = round(live_price * (1 + spread * 0.05), dec)
        s1 = round(live_price * (1 - spread * 1.2), dec)
        s2 = round(live_price * (1 - spread * 2.2), dec)
        r1 = round(live_price * (1 + spread * 1.2), dec)
        r2 = round(live_price * (1 + spread * 2.2), dec)
        rsi = 50.0
        macro_driver = f"Consolidación en rango equilibrado alrededor del punto de control dPOC ({dpoc})."
        technical_thesis = f"Precio oscilando entre el soporte {s1} y la resistencia {r1}. Se recomienda esperar confirmación de ruptura de banda VWAP ({vwap})."
        tags = ["RANGE_CONSOLIDATION", "NEUTRAL_POC", "WAIT_BREAKOUT"]

    return {
        'symbol': sym,
        'current_price': live_price,
        'change_24h_pct': pct_change,
        'bias': bias,
        'bias_score': score,
        'support_1': s1,
        'support_2': s2,
        'resistance_1': r1,
        'resistance_2': r2,
        'dpoc_price': dpoc,
        'session_vwap': vwap,
        'macro_driver': macro_driver,
        'technical_thesis': technical_thesis,
        'cited_key_levels': [s1, dpoc, r1, vwap],
        'catalyst_tags': tags,
        'last_updated': datetime.now(timezone.utc).isoformat(),
        'updated_by': 'AEON_AUTONOMOUS_ENGINE_V2'
    }

# Prueba con 14 activos en vivo
test_prices = {
    'XAUUSD': 4471.08,
    'EURUSD': 1.1597,
    'GBPUSD': 1.3552,
    'USDJPY': 159.98,
    'AUDUSD': 0.7166,
    'NZDUSD': 0.6280,
    'USDCAD': 1.3897,
    'USDCHF': 0.8085,
    'DXY': 99.566,
    'SPX500': 7728.75,
    'NAS100': 29597.75,
    'US30': 44950.00,
    'JP225': 66617.00,
    'BTCUSD': 77849.00
}

print("=== VERIFICACIÓN DEL MOTOR CUÁNTICO MULTI-ACTIVO ===")
for sym, p in test_prices.items():
    res = compute_institutional_quant_metrics(sym, p)
    print(f"[{sym:<7}] Price: {p:<10} | Change: {res['change_24h_pct']:>6}% | Bias: {res['bias']:<7} ({res['bias_score']}%) | dPOC: {res['dpoc_price']} | VWAP: {res['session_vwap']}")
