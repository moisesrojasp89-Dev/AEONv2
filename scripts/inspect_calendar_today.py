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

url = f"{env.get('SUPABASE_URL')}/rest/v1/economic_calendar?select=*&order=event_time.asc"
req = urllib.request.Request(
    url,
    headers={
        'apikey': env.get('SUPABASE_SERVICE_ROLE_KEY'),
        'Authorization': 'Bearer ' + env.get('SUPABASE_SERVICE_ROLE_KEY')
    }
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print(f"Total events in Supabase: {len(data)}")
    for ev in data:
        t = ev.get('event_time', '')
        if '2026-08-28' in t or '2026-08-29' in t:
            print(f"ID: {ev.get('id')} | Time: {t} | {ev.get('currency')} | {ev.get('event_name')} | Actual: {ev.get('actual')} | Forecast: {ev.get('forecast')} | Previous: {ev.get('previous')}")
