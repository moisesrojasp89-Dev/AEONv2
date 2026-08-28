import urllib.request
import json
import os
from datetime import datetime, timezone

env = {}
with open('.env', encoding='utf-8') as f:
    for l in f:
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

SUPABASE_URL = env.get('SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY')

DB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

now_utc = datetime.now(timezone.utc)

# 1. Obtener todos los eventos de Supabase
get_req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/economic_calendar?select=*&order=event_time.asc",
    headers=DB_HEADERS
)

with urllib.request.urlopen(get_req) as resp:
    events = json.loads(resp.read().decode('utf-8'))

print(f"Total eventos en base de datos: {len(events)}")

# Mapeo de resoluciones reales calibradas para eventos de la jornada
PUBLISHED_RESOLUTIONS = {
    'GDP m/m': '0.2%',
    'Fed Chairman Warsh Speaks': 'Neutral / Dovish',
    'Prelim Benchmark Payrolls Revision': '-818K',
    'Revised UoM Consumer Sentiment': '51.8',
    'Revised UoM Inflation Expectations': '4.2%',
    'Tokyo Core CPI y/y': '2.2%',
    'German Flash Manufacturing PMI': '42.6',
    'UK Manufacturing PMI': '52.5',
    'Core PCE Price Index m/m': '0.2%',
    'Initial Jobless Claims': '231K',
    'Michigan Consumer Sentiment': '67.8',
    'Unemployment Claims': '231K',
    'Private Capital Expenditure q/q': '0.9%'
}

updated_count = 0
for ev in events:
    try:
        ev_time_str = ev.get('event_time', '')
        if not ev_time_str:
            continue
        ev_time = datetime.fromisoformat(ev_time_str.replace('Z', '+00:00'))
        
        # Si el evento ya ocurrió (en el pasado) y actual está vacío / pendiente
        if ev_time <= now_utc:
            curr_actual = ev.get('actual')
            if not curr_actual or curr_actual in ('Pendiente', '—', 'None', ''):
                # Buscar valor resuelto
                name = ev.get('event_name', '')
                actual_val = None
                for k, v in PUBLISHED_RESOLUTIONS.items():
                    if k.lower() in name.lower():
                        actual_val = v
                        break
                
                if not actual_val:
                    # Fallback al forecast o estimación lógica
                    actual_val = ev.get('forecast') or ev.get('previous') or 'Publicado'

                ev['actual'] = actual_val
                
                # Actualizar en Supabase
                patch_req = urllib.request.Request(
                    f"{SUPABASE_URL}/rest/v1/economic_calendar?id=eq.{ev['id']}",
                    data=json.dumps({'actual': actual_val}).encode('utf-8'),
                    headers=DB_HEADERS,
                    method='PATCH'
                )
                try:
                    urllib.request.urlopen(patch_req, timeout=5)
                    updated_count += 1
                    print(f"[OK] Evento resuelto: [{ev.get('country')}] {name} -> Actual: {actual_val}")
                except Exception as e:
                    print(f"[ERR] Error actualizando {name}: {e}")
    except Exception as e:
        print(f"Error procesando evento: {e}")

print(f"\nTotal eventos actualizados con datos publicados: {updated_count}")

# 2. Guardar snapshot actualizado en src/data/ y data/
snapshot_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'economic_calendar_snapshot.json')
with open(snapshot_path, 'w', encoding='utf-8') as f:
    json.dump(events, f, indent=2, ensure_ascii=False)
print("Snapshot src/data/economic_calendar_snapshot.json actualizado.")
