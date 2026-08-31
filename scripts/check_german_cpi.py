import urllib.request
import json

env = {}
with open('.env', encoding='utf-8') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('SUPABASE_URL', '')
key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

req = urllib.request.Request(f"{url}/rest/v1/economic_calendar?country=eq.EUR&event_name=ilike.*German*", headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    for d in data:
        print(f"ID: {d['id']} | Time: {d['event_time']} | Name: {d['event_name']} | Act: {d['actual']}")
