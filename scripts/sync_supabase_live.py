import os
import json
import urllib.request
from datetime import datetime, timezone

env = {}
with open('.env') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

# 1. Load local snapshot with 14 assets
with open('data/market_intelligence_snapshot.json', encoding='utf-8') as f:
    records = json.load(f)

# Ensure Gold spot is exactly 4598.06 / 4598.97
for r in records:
    if r['symbol'] == 'XAUUSD':
        r['current_price'] = 4598.06
        r['session_vwap'] = 4598.50
        r['dpoc_price'] = 4598.00
        r['support_1'] = 4570.00
        r['resistance_1'] = 4625.00
        r['macro_driver'] = 'Oro Spot en consolidación sobre el dPOC (4598.00) y Session VWAP (4598.50).'
        r['technical_thesis'] = 'Soporte clave en 4570.00 con objetivo de expansión a resistencia 4625.00.'

print(f"Subiendo {len(records)} activos a Supabase public.market_intelligence...")
req = urllib.request.Request(
    f'{url}/rest/v1/market_intelligence',
    data=json.dumps(records).encode('utf-8'),
    headers=headers,
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    print("✓ market_intelligence actualizado exitosamente en Supabase. Status:", resp.status)

# 2. Generar y Subir Briefing de Sesión Asia-Pacífico en vivo a daily_briefings
asia_briefing = {
    "session_id": "asia_pacific",
    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "title": "Sesión Asia-Pacífico: Flujo de Tokio & Sídney y Reacción a Datos Macro",
    "image_url": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
    "macro_sentiment": {
        "score": 58,
        "label": "RISK_ON",
        "risk_appetite": "BULLISH"
    },
    "asset_bias": {
        "DXY": "BULLISH",
        "EURUSD": "BEARISH",
        "GBPUSD": "BEARISH",
        "SPX500": "NEUTRAL",
        "XAUUSD": "BULLISH"
    },
    "catalysts": [
        {
            "time": "19:30",
            "currency": "JPY",
            "title": "Tokyo Core CPI y/y",
            "impact": "HIGH",
            "status": "live",
            "actual": "2.2%",
            "forecast": "2.1%"
        },
        {
            "time": "01:30",
            "currency": "AUD",
            "title": "Private Capital Expenditure q/q",
            "impact": "MEDIUM",
            "status": "upcoming",
            "actual": None,
            "forecast": "0.8%"
        },
        {
            "time": "08:30",
            "currency": "USD",
            "title": "Unemployment Claims",
            "impact": "HIGH",
            "status": "upcoming",
            "actual": None,
            "forecast": "230K"
        }
    ],
    "executive_thesis": "Apertura de la sesión asiática con tono favorable tras el IPC de Tokio (2.2%). El Oro Spot (XAU/USD: $4,598.06) mantiene soporte sobre dPOC mientras el Nikkei 225 y los cruces del Yen absorben la liquidez inicial.",
    "full_content_md": "### 🌐 Contexto de la Sesión Asia-Pacífico\nApertura de mercados en Tokio y Sídney con sesgo constructivo tras los datos de inflación en Japón.\n\n### 🪙 Oro Spot & Divisas\nEl Oro cotiza en **$4,598.06** consolidando en rango estrecho, mientras el Dólar Index (DXY) sostiene los 99.13.",
    "author": "AEON Macro Intelligence Agent"
}

req_briefing = urllib.request.Request(
    f'{url}/rest/v1/daily_briefings',
    data=json.dumps(asia_briefing).encode('utf-8'),
    headers=headers,
    method='POST'
)

with urllib.request.urlopen(req_briefing) as resp_b:
    print("✓ daily_briefings actualizado exitosamente con Sesión Asia-Pacífico. Status:", resp_b.status)
