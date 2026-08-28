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

try:
    req = urllib.request.Request(f'{url}/rest/v1/economic_calendar?select=*&limit=5', headers=headers)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())
        print('=== SUPABASE economic_calendar count:', len(data))
        if data:
            print(json.dumps(data[0], indent=2))
except Exception as e:
    print('Error querying economic_calendar:', e)
