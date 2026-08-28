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

req = urllib.request.Request(f'{url}/rest/v1/economic_calendar?select=id,event_time,country,event_name,impact&order=event_time.asc', headers=headers)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode())
    print('Total events in economic_calendar:', len(data))
    for row in data:
        print(f"{row.get('event_time')} | {row.get('country')} | {row.get('impact')} | {row.get('event_name')}")
