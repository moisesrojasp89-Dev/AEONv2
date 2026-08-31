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

# 1. Actualizar evento Retail Sales en economic_calendar
req = urllib.request.Request(
    f"{url}/rest/v1/economic_calendar?country=eq.JPY&event_name=ilike.*Retail*Sales*",
    data=json.dumps({'actual': '1.2%'}).encode('utf-8'),
    headers=headers,
    method='PATCH'
)
with urllib.request.urlopen(req, timeout=5) as resp:
    print("[OK] JPY Retail Sales actualizado a 1.2% en economic_calendar. Status:", resp.status)

# 2. Re-consultar catalizadores para el briefing activo
req_cal = urllib.request.Request(
    f"{url}/rest/v1/economic_calendar?order=event_time.asc",
    headers={'apikey': key, 'Authorization': f'Bearer {key}'}
)
with urllib.request.urlopen(req_cal, timeout=5) as resp:
    all_events = json.loads(resp.read().decode('utf-8'))

now_utc = datetime.now(timezone.utc)
# Filtrar y ordenar eventos relevantes
scored = []
for ev in all_events:
    try:
        ev_time = datetime.fromisoformat(ev['event_time'].replace('Z', '+00:00'))
        diff_h = (ev_time - now_utc).total_seconds() / 3600.0
        if -24 <= diff_h <= 48 and ev.get('country') in ('JPY', 'CNY', 'AUD', 'USD'):
            imp_score = 3 if str(ev.get('impact', '')).upper() == 'HIGH' else (2 if str(ev.get('impact', '')).upper() == 'MEDIUM' else 1)
            score = (50 if ev.get('country') in ('JPY', 'CNY', 'AUD') else 20) + (imp_score * 20) - abs(diff_h)
            scored.append((score, ev_time, ev))
    except Exception:
        continue

scored.sort(key=lambda x: x[0], reverse=True)
top = [x[2] for x in scored[:3]]

new_catalysts = []
for ev in top:
    ev_time = datetime.fromisoformat(ev['event_time'].replace('Z', '+00:00'))
    actual_val = ev.get('actual')
    is_past = (ev_time <= now_utc)
    status = 'live' if (is_past or (actual_val and actual_val not in ('Pendiente', '—', 'None'))) else 'upcoming'
    if is_past and not actual_val:
        actual_val = 'Publicado'
    
    new_catalysts.append({
        'time': ev_time.strftime('%H:%M'),
        'currency': ev.get('country', 'USD'),
        'title': ev.get('event_name', ''),
        'impact': str(ev.get('impact', 'HIGH')).upper(),
        'status': status,
        'actual': actual_val,
        'forecast': ev.get('forecast'),
        'previous': ev.get('previous')
    })

print("Nuevos Catalizadores del Briefing:", json.dumps(new_catalysts, indent=2))

# 3. Actualizar último briefing en Supabase
req_last_b = urllib.request.Request(
    f"{url}/rest/v1/daily_briefings?order=created_at.desc&limit=1",
    headers={'apikey': key, 'Authorization': f'Bearer {key}'}
)
with urllib.request.urlopen(req_last_b, timeout=5) as resp:
    last_b = json.loads(resp.read().decode('utf-8'))[0]

req_patch_b = urllib.request.Request(
    f"{url}/rest/v1/daily_briefings?id=eq.{last_b['id']}",
    data=json.dumps({'catalysts': new_catalysts}).encode('utf-8'),
    headers=headers,
    method='PATCH'
)
with urllib.request.urlopen(req_patch_b, timeout=5) as resp:
    print("[OK] Briefing actualizado con el dato publicado de Retail Sales (1.2%). Status:", resp.status)
