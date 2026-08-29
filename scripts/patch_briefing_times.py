import urllib.request
import json

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

# Timestamps en UTC estricto para que formatToUserLocalTime() los convierta a la hora local exacta del usuario:
# UTC 23:30 = 19:30 Local (UTC-4) / 08:30 Tokio (UTC+9)
# UTC 01:30 = 21:30 Local (UTC-4) / 11:30 Sídney (UTC+10)
# UTC 12:30 = 08:30 Local (UTC-4) / 08:30 NY ET
# UTC 14:00 = 10:00 Local (UTC-4) / 10:00 NY ET

asian_catalysts = [
    {'time': '23:30', 'currency': 'JPY', 'title': 'Tokyo Core CPI y/y (2.2%)', 'impact': 'HIGH', 'status': 'live', 'actual': '2.2%', 'forecast': '2.1%'},
    {'time': '01:30', 'currency': 'AUD', 'title': 'Private Capital Expenditure q/q', 'impact': 'MEDIUM', 'status': 'upcoming', 'actual': None, 'forecast': '0.8%'},
    {'time': '12:30', 'currency': 'USD', 'title': 'Unemployment Claims', 'impact': 'HIGH', 'status': 'upcoming', 'actual': None, 'forecast': '230K'}
]

ny_catalysts = [
    {'time': '12:30', 'currency': 'USD', 'title': 'Core PCE Price Index m/m (0.2%)', 'impact': 'HIGH', 'status': 'live', 'actual': '0.2%', 'forecast': '0.2%'},
    {'time': '12:30', 'currency': 'USD', 'title': 'Initial Jobless Claims (231K)', 'impact': 'HIGH', 'status': 'live', 'actual': '231K', 'forecast': '232K'},
    {'time': '14:00', 'currency': 'USD', 'title': 'Michigan Consumer Sentiment (67.8)', 'impact': 'MEDIUM', 'status': 'live', 'actual': '67.8', 'forecast': '67.5'}
]

london_catalysts = [
    {'time': '07:00', 'currency': 'EUR', 'title': 'German Flash Manufacturing PMI', 'impact': 'HIGH', 'status': 'live', 'actual': '42.6', 'forecast': '43.1'},
    {'time': '08:30', 'currency': 'GBP', 'title': 'UK Manufacturing PMI', 'impact': 'HIGH', 'status': 'live', 'actual': '52.5', 'forecast': '52.1'},
    {'time': '12:30', 'currency': 'USD', 'title': 'Core PCE Price Index', 'impact': 'HIGH', 'status': 'upcoming', 'actual': None, 'forecast': '0.2%'}
]

req1 = urllib.request.Request(f"{url}/rest/v1/daily_briefings?id=eq.d813f823-b0b1-4e7f-bd1e-4417aee65432", data=json.dumps({'catalysts': asian_catalysts}).encode('utf-8'), headers=headers, method='PATCH')
urllib.request.urlopen(req1, timeout=5)

req2 = urllib.request.Request(f"{url}/rest/v1/daily_briefings?id=eq.fe02dfe6-6047-4b52-b7e9-d312da06ee7a", data=json.dumps({'catalysts': ny_catalysts}).encode('utf-8'), headers=headers, method='PATCH')
urllib.request.urlopen(req2, timeout=5)

req3 = urllib.request.Request(f"{url}/rest/v1/daily_briefings?id=eq.820972a1-6677-418f-8020-797029198f9d", data=json.dumps({'catalysts': london_catalysts}).encode('utf-8'), headers=headers, method='PATCH')
urllib.request.urlopen(req3, timeout=5)

print("[OK] Catalizadores actualizados con formato UTC estandarizado en Supabase.")
