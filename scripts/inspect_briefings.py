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

req = urllib.request.Request(f'{url}/rest/v1/daily_briefings?select=*&order=created_at.desc', headers=headers)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode())
    print('=== SUPABASE public.daily_briefings count:', len(data))
    for row in data:
        print(f"ID: {row.get('id')} | Date: {row.get('date')} | Session: {row.get('session_id')} | Title: {row.get('title')}")
