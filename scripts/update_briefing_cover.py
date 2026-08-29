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
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

new_img = 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1200&auto=format&fit=crop'

req = urllib.request.Request(
    f"{url}/rest/v1/daily_briefings?id=eq.fe02dfe6-6047-4b52-b7e9-d312da06ee7a",
    data=json.dumps({'image_url': new_img}).encode('utf-8'),
    headers=headers,
    method='PATCH'
)
with urllib.request.urlopen(req, timeout=5) as resp:
    print("[OK] Imagen de portada del briefing actualizada en Supabase. Status:", resp.status)
