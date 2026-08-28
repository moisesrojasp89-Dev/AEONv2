import os
import json
import urllib.request

env = {}
with open('.env') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_ROLE_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

req = urllib.request.Request(f'{url}/rest/v1/economic_calendar?select=*&order=event_time.asc', headers=headers)
with urllib.request.urlopen(req) as r:
    events = json.loads(r.read().decode())

out_path = 'data/economic_calendar_snapshot.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(events, f, indent=2, ensure_ascii=False)

print(f"✓ {len(events)} eventos económicos exportados exitosamente a {out_path}")
