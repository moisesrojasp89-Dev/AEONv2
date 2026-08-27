import urllib.request
import json
import os

env_vars = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

url = env_vars.get('VITE_SUPABASE_URL') + '/functions/v1/oanda'
anon = env_vars.get('VITE_SUPABASE_ANON_KEY')

try:
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {anon}'})
    with urllib.request.urlopen(req, timeout=8) as r:
        data = json.loads(r.read().decode())
        print('Supabase Edge Function OANDA Response:')
        print(json.dumps(data, indent=2))
except Exception as e:
    print('Edge function error:', e)
