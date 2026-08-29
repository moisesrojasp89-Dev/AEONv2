import urllib.request
import json
from datetime import datetime, timezone

env = {}
with open('.env', encoding='utf-8') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('SUPABASE_URL', '')
key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

now_utc = datetime.now(timezone.utc)
payload = {
    'id': 'fe02dfe6-6047-4b52-b7e9-d312da06ee7a',
    'session_id': 'ny_pre',
    'date': now_utc.strftime('%Y-%m-%d'),
    'created_at': now_utc.isoformat(),
    'title': 'Resumen Semanal & Cierre de Mercados: Balance Macro y Perspectiva de Apertura',
    'image_url': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop',
    'macro_sentiment': {'score': 55, 'label': 'RISK_ON', 'risk_appetite': 'NEUTRAL'},
    'asset_bias': {'DXY': 'BULLISH', 'EURUSD': 'BEARISH', 'XAUUSD': 'BEARISH', 'BTCUSD': 'BEARISH', 'SPX500': 'BULLISH', 'NAS100': 'BULLISH', 'US30': 'BULLISH', 'USDJPY': 'BULLISH'},
    'catalysts': [
        {'time': '14:00', 'currency': 'USD', 'title': 'Prelim Benchmark Payrolls Revision', 'impact': 'HIGH', 'status': 'live', 'actual': '-79K', 'forecast': None, 'previous': '-911K'},
        {'time': '14:00', 'currency': 'USD', 'title': 'Fed Chairman Warsh Speaks', 'impact': 'HIGH', 'status': 'live', 'actual': 'Publicado', 'forecast': None, 'previous': None},
        {'time': '23:30', 'currency': 'JPY', 'title': 'Tokyo Core CPI y/y', 'impact': 'MEDIUM', 'status': 'live', 'actual': '1.8%', 'forecast': '1.8%', 'previous': '1.7%'}
    ],
    'executive_thesis': 'Cierre semanal de mercados globales. El Oro Spot ($4,454.99) y las divisas consolidan tras asimilar la firmeza del Dólar Index (99.68) y el tono de la Fed. Bitcoin ($78,238) mantiene negociación activa 24/7 de cara a la apertura del domingo.',
    'author': 'AEON Macro Intelligence AI'
}

try:
    req = urllib.request.Request(f"{url}/rest/v1/daily_briefings?on_conflict=id", data=json.dumps([payload]).encode('utf-8'), headers=headers, method='POST')
    with urllib.request.urlopen(req) as resp:
        print("[SUCCESS] Status:", resp.status)
except urllib.error.HTTPError as e:
    print("[HTTP ERROR]:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("[ERROR]:", e)
