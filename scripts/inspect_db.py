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

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json'
}

# 1. Check market_intelligence
req = urllib.request.Request(f'{url}/rest/v1/market_intelligence?select=*', headers=headers)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode())
    print('=== SUPABASE market_intelligence count:', len(data))

# 2. Check daily_briefings
try:
    req2 = urllib.request.Request(f'{url}/rest/v1/daily_briefings?select=*&limit=1', headers=headers)
    with urllib.request.urlopen(req2) as r:
        data2 = json.loads(r.read().decode())
        print('\n=== SUPABASE daily_briefings ===')
        if data2:
            print('ID:', data2[0].get('id'))
            print('Date:', data2[0].get('date'))
            print('Title:', data2[0].get('title'))
            print('Session:', data2[0].get('session'))
            print('Keys in row:', list(data2[0].keys()))
except Exception as e:
    print('daily_briefings err:', e)
