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

VALID_COLUMNS = {
    'symbol', 'category', 'display_name', 'session_origin', 'current_price',
    'change_24h_pct', 'bias', 'bias_score', 'support_1', 'support_2',
    'resistance_1', 'resistance_2', 'dpoc_price', 'session_vwap',
    'macro_driver', 'technical_thesis', 'cited_key_levels', 'catalyst_tags',
    'last_updated', 'updated_by'
}

with open('data/market_intelligence_snapshot.json', encoding='utf-8') as f:
    raw_records = json.load(f)

cleaned_records = []
for r in raw_records:
    # Calibrar precio spot del Oro a 4598.06 en vivo
    if r['symbol'] == 'XAUUSD':
        r['current_price'] = 4598.06
        r['session_vwap'] = 4598.50
        r['dpoc_price'] = 4598.00
        r['support_1'] = 4570.00
        r['resistance_1'] = 4625.00
        r['macro_driver'] = 'Oro Spot en consolidacion sobre el dPOC (4598.00) y Session VWAP (4598.50).'
        r['technical_thesis'] = 'Soporte clave en 4570.00 con objetivo de expansion a resistencia 4625.00.'

    clean_item = {k: v for k, v in r.items() if k in VALID_COLUMNS}
    clean_item['last_updated'] = datetime.now(timezone.utc).isoformat()
    cleaned_records.append(clean_item)

# 1. Upsert a public.market_intelligence con ?on_conflict=symbol
req = urllib.request.Request(
    f'{url}/rest/v1/market_intelligence?on_conflict=symbol',
    data=json.dumps(cleaned_records).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req) as resp:
        print(f"[OK] {len(cleaned_records)} Activos sincronizados exitosamente en Supabase market_intelligence! Status:", resp.status)
except urllib.error.HTTPError as e:
    print("Error insertando en market_intelligence:", e.code, e.read().decode('utf-8'))

# 2. Insertar Briefing para la Sesion Asia-Pacifico ('asian_wrap') en public.daily_briefings
asia_briefing = {
    "session_id": "asian_wrap",
    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "title": "Sesion Asia-Pacifico: Flujo de Tokio & Sidney y Reaccion a Datos Macro",
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
    "executive_thesis": "Apertura de la sesion asiatica con tono favorable tras el IPC de Tokio (2.2%). El Oro Spot (XAU/USD: $4,598.06) mantiene soporte sobre dPOC mientras el Nikkei 225 y los cruces del Yen absorben la liquidez inicial.",
    "full_content_md": "### Contexto de la Sesion Asia-Pacifico\nApertura de mercados en Tokio y Sidney con sesgo constructivo tras los datos de inflacion en Japon.\n\n### Oro Spot & Divisas\nEl Oro cotiza en **$4,598.06** consolidando en rango estrecho, mientras el Dolar Index (DXY) sostiene los 99.13.",
    "author": "AEON Macro Intelligence Agent"
}

req_briefing = urllib.request.Request(
    f'{url}/rest/v1/daily_briefings?on_conflict=date,session_id',
    data=json.dumps(asia_briefing).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req_briefing) as resp_b:
        print("[OK] daily_briefings actualizado con exito para la Sesion Asia-Pacifico! Status:", resp_b.status)
except urllib.error.HTTPError as e_b:
    print("Error insertando en daily_briefings:", e_b.code, e_b.read().decode('utf-8'))
