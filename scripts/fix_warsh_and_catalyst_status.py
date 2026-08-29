import urllib.request
import json
from datetime import datetime, timezone

env = {}
with open('.env', encoding='utf-8') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('SUPABASE_URL', '')
key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

# 1. Actualizar el evento de Warsh en Supabase para marcarlo como Publicado
req = urllib.request.Request(
    f"{url}/rest/v1/economic_calendar?id=eq.ab023109-e0f7-4fca-a909-7825cf9df85c",
    data=json.dumps({'actual': 'Publicado'}).encode('utf-8'),
    headers=headers,
    method='PATCH'
)
with urllib.request.urlopen(req, timeout=5) as resp:
    print("[OK] Evento Warsh actualizado en Supabase a 'Publicado'. Status:", resp.status)
