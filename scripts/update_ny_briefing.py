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

now_utc = datetime.now(timezone.utc)

briefing_payload = {
    'id': 'fe02dfe6-6047-4b52-b7e9-d312da06ee7a',
    'session_id': 'ny_pre',
    'date': now_utc.strftime('%Y-%m-%d'),
    'created_at': now_utc.isoformat(),
    'title': 'Sesión Americana (Wall Street & Fed): Flujo Institucional y Reacción a Datos Macro',
    'image_url': 'https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=1200&auto=format&fit=crop',
    'macro_sentiment': {'score': 62, 'label': 'RISK_ON', 'risk_appetite': 'BULLISH'},
    'asset_bias': {'XAUUSD': 'BULLISH', 'EURUSD': 'NEUTRAL', 'GBPUSD': 'NEUTRAL', 'DXY': 'BEARISH', 'SPX500': 'BULLISH'},
    'catalysts': [
        {'time': '08:30', 'currency': 'USD', 'title': 'Core PCE Price Index m/m (0.2%)', 'impact': 'HIGH', 'status': 'live', 'actual': '0.2%', 'forecast': '0.2%'},
        {'time': '08:30', 'currency': 'USD', 'title': 'Initial Jobless Claims (231K)', 'impact': 'HIGH', 'status': 'live', 'actual': '231K', 'forecast': '232K'},
        {'time': '10:00', 'currency': 'USD', 'title': 'Michigan Consumer Sentiment', 'impact': 'MEDIUM', 'status': 'live', 'actual': '67.8', 'forecast': '67.5'}
    ],
    'executive_thesis': 'Apertura de la sesión americana con sesgo constructivo. El S&P 500 y Nasdaq absorben liquidez tras la moderación del PCE, mientras el Oro Spot ($4,573) defiende su dPOC institucional.',
    'author': 'AEON Macro Intelligence AI (Wall Street Desk)'
}

req = urllib.request.Request(
    f"{env.get('SUPABASE_URL')}/rest/v1/daily_briefings?on_conflict=id",
    data=json.dumps([briefing_payload]).encode('utf-8'),
    headers={
        'apikey': env.get('SUPABASE_SERVICE_ROLE_KEY'),
        'Authorization': 'Bearer ' + env.get('SUPABASE_SERVICE_ROLE_KEY'),
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    },
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    print("NY Briefing successfully updated in Supabase!")
