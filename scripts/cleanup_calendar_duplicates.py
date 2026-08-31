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

url = env.get('SUPABASE_URL', '')
key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

# Eliminar fila vieja duplicada del domingo
req = urllib.request.Request(
    f"{url}/rest/v1/economic_calendar?id=eq.2283f50c-ada3-4465-ba8c-b41fd4e58d72",
    headers=headers,
    method='DELETE'
)
with urllib.request.urlopen(req, timeout=5) as resp:
    print("[OK] Fila duplicada de German CPI eliminada en Supabase. Status:", resp.status)

# Actualizar snapshot local
snap_path = os.path.join('src', 'data', 'economic_calendar_snapshot.json')
with open(snap_path, encoding='utf-8') as f:
    data = json.load(f)

data_clean = [e for e in data if e['id'] != '2283f50c-ada3-4465-ba8c-b41fd4e58d72']
for e in data_clean:
    if e.get('country') == 'JPY' and 'Retail' in e.get('event_name', ''):
        e['actual'] = '1.2%'

with open(snap_path, 'w', encoding='utf-8') as f:
    json.dump(data_clean, f, indent=2, ensure_ascii=False)

print("[OK] Snapshot local limpiado y actualizado.")
