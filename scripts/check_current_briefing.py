import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

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

req = urllib.request.Request(f"{url}/rest/v1/daily_briefings?select=*&order=created_at.desc&limit=1", headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    b = data[0]
    print("Title:", b.get('title'))
    print("Catalysts:")
    for c in b.get('catalysts', []):
        print(f"[{c.get('time')}] {c.get('currency')} · {c.get('title')} | Impact: {c.get('impact')} | Status: {c.get('status')} | Act: {c.get('actual')}")
