import json
import urllib.request
from datetime import datetime, timezone
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

def get_session_dynamic_catalysts(session_id: str, now_utc=None):
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    
    # 1. Cargar eventos desde Supabase o Snapshot
    events = []
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/economic_calendar?select=*&order=event_time.asc",
            headers={'apikey': key, 'Authorization': f'Bearer {key}'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            events = json.loads(resp.read().decode('utf-8'))
    except Exception:
        cal_path = os.path.join('src', 'data', 'economic_calendar_snapshot.json')
        if os.path.exists(cal_path):
            with open(cal_path, encoding='utf-8') as f:
                events = json.load(f)

    if not events:
        return []

    # 2. Mapeo de divisas por sesión
    session_currencies = {
        'asian_wrap': ['JPY', 'AUD', 'NZD', 'CNY'],
        'london_pre': ['EUR', 'GBP', 'CHF'],
        'ny_pre': ['USD', 'CAD']
    }
    target_currencies = session_currencies.get(session_id, ['USD', 'EUR', 'JPY', 'GBP'])

    # 3. Filtrar y ordenar eventos relevantes por fecha y sesión
    scored_events = []
    for ev in events:
        try:
            ev_time = datetime.fromisoformat(ev['event_time'].replace('Z', '+00:00'))
            diff_hours = (ev_time - now_utc).total_seconds() / 3600.0
            
            # Prioridad 1: Divisas de la sesión actual
            curr_match = ev.get('country') in target_currencies
            impact_score = 3 if str(ev.get('impact', '')).upper() == 'HIGH' else (2 if str(ev.get('impact', '')).upper() == 'MEDIUM' else 1)
            
            # Puntuación de proximidad: eventos de hoy (últimas 24h a próximas 48h)
            time_proximity_score = 0
            if -24 <= diff_hours <= 48:
                time_proximity_score = 100 - abs(diff_hours)
            
            total_score = (50 if curr_match else 0) + (impact_score * 20) + time_proximity_score
            scored_events.append((total_score, ev_time, ev))
        except Exception:
            continue

    # Ordenar por puntuación descendente
    scored_events.sort(key=lambda x: (x[0], -abs((x[1] - now_utc).total_seconds())), reverse=True)
    
    top_events = [x[2] for x in scored_events[:3]]

    # 4. Formatear para el Daily Briefing
    catalysts_payload = []
    for ev in top_events:
        try:
            ev_time = datetime.fromisoformat(ev['event_time'].replace('Z', '+00:00'))
            actual_val = ev.get('actual')
            is_live = bool(actual_val and actual_val not in ('Pendiente', '—', 'None', ''))
            
            catalysts_payload.append({
                'time': ev_time.strftime('%H:%M'), # Hora en UTC exacta
                'currency': ev.get('country', 'USD'),
                'title': ev.get('event_name', ''),
                'impact': str(ev.get('impact', 'HIGH')).upper(),
                'status': 'live' if is_live else 'upcoming',
                'actual': actual_val if is_live else None,
                'forecast': ev.get('forecast'),
                'previous': ev.get('previous')
            })
        except Exception:
            continue

    return catalysts_payload

print("=== PRUEBA DE CATALIZADORES DINÁMICOS DESDE BASE DE DATOS ===")
for s_id in ['asian_wrap', 'london_pre', 'ny_pre']:
    cats = get_session_dynamic_catalysts(s_id)
    print(f"\n--- Sesión: {s_id} ({len(cats)} eventos extraídos) ---")
    for c in cats:
        print(f"[{c['time']} UTC] {c['currency']} · {c['title']} | Impact: {c['impact']} | Status: {c['status']} | Actual: {c['actual']} | Forecast: {c['forecast']}")
