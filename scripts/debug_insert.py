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
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

with open('data/market_intelligence_snapshot.json', encoding='utf-8') as f:
    records = json.load(f)

# Test first record to inspect error
test_row = records[0]
req = urllib.request.Request(
    f'{url}/rest/v1/market_intelligence',
    data=json.dumps(test_row).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Success:", resp.status)
except urllib.error.HTTPError as e:
    print("Error code:", e.code)
    print("Error body:", e.read().decode('utf-8'))
