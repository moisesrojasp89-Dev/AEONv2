import urllib.request
import json
import os

env = {}
with open('.env', encoding='utf-8') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('SUPABASE_URL') + '/rest/v1/daily_briefings?select=*&order=created_at.desc'
req = urllib.request.Request(
    url,
    headers={
        'apikey': env.get('SUPABASE_SERVICE_ROLE_KEY'),
        'Authorization': 'Bearer ' + env.get('SUPABASE_SERVICE_ROLE_KEY')
    }
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print(f"Total briefings in Supabase: {len(data)}")
    for b in data:
        print(f"ID: {b.get('id')} | session_id: {b.get('session_id')} | Date: {b.get('date')} | Title: {b.get('title')} | Created: {b.get('created_at')}")
