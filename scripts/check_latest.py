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

req = urllib.request.Request(f'{url}/rest/v1/daily_briefings?select=*&order=created_at.desc&limit=1', headers=headers)
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read().decode())
    print('Latest Briefing in Supabase:')
    print('Title:', d[0].get('title'))
    print('Session ID:', d[0].get('session_id'))
    print('Date:', d[0].get('date'))

req2 = urllib.request.Request(f'{url}/rest/v1/market_intelligence?select=symbol,display_name,current_price,session_vwap,dpoc_price&symbol=eq.XAUUSD', headers=headers)
with urllib.request.urlopen(req2) as r:
    d2 = json.loads(r.read().decode())
    print('\nGold in Supabase market_intelligence:')
    print(json.dumps(d2, indent=2))
