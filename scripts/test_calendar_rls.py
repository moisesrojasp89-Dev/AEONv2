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
# Test with EMPTY key or ANON key
headers = {}

try:
    req = urllib.request.Request(f'{url}/rest/v1/economic_calendar?select=*&limit=2', headers=headers)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())
        print('Anonymous query to economic_calendar success:', len(data))
except Exception as e:
    print('Anonymous query error:', e)
