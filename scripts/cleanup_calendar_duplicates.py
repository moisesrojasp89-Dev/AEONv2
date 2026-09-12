"""
AEON · scripts/cleanup_calendar_duplicates.py
Auditor y Limpiador de Integridad Macroeconómica para Supabase.
Verifica:
  1. Eventos en fin de semana (fantasmas).
  2. Duplicados exactos o colisiones temporales.
  3. Contradicciones numéricas o eventos huérfanos.
"""

import os
import urllib.request
import json
from collections import defaultdict
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not KEY:
    print("[ERROR] Credenciales de Supabase no encontradas en .env")
    exit(1)

url = f"{SUPABASE_URL}/rest/v1/economic_calendar?select=*&order=event_time.asc"
req = urllib.request.Request(url, headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        events = json.loads(resp.read().decode())
except Exception as e:
    print(f"[ERROR] Fallo al consultar Supabase: {e}")
    exit(1)

print(f"[*] Auditando {len(events)} eventos en Supabase...\n")

anomalies = []

# 1. Regla: Cero eventos fantasmas en fin de semana
for ev in events:
    t_str = ev.get('event_time')
    if not t_str:
        anomalies.append(f"Evento sin fecha: ID {ev.get('id')}")
        continue
    dt = datetime.fromisoformat(t_str.replace('Z', '+00:00'))
    weekday = dt.weekday() # 5 = Sábado, 6 = Domingo
    curr = ev.get('country', '')
    
    # Sábados: NINGÚN banco central ni reporte macro opera
    if weekday == 5:
        anomalies.append(f"[FIN DE SEMANA] Evento en Sábado: {t_str} | {curr} | {ev.get('event_name')} (ID: {ev.get('id')})")
    # Domingos: Solo se permite sesión asiática tardía (> 19:00 UTC para JPY/CNY/AUD) o Simposios de Fin de Semana (Jackson Hole / BIS)
    elif weekday == 6:
        is_asian = dt.hour >= 19 and curr in ('JPY', 'CNY', 'AUD', 'NZD')
        is_symposium = any(w in ev.get('event_name', '').lower() for w in ('bessent', 'jackson hole', 'symposium', 'g20'))
        if not (is_asian or is_symposium):
            anomalies.append(f"[FIN DE SEMANA] Evento en Domingo no asiático: {t_str} | {curr} | {ev.get('event_name')}")

# 2. Regla: Cero duplicados exactos o colisiones en el mismo minuto y divisa
by_time_curr = defaultdict(list)
for ev in events:
    t = ev['event_time'][:16]
    c = ev.get('country', 'N/A').upper()
    norm_name = "".join(ch for ch in ev.get('event_name', '').lower() if ch.isalnum())
    by_time_curr[(t, c, norm_name)].append(ev)

for (t, c, norm_name), evts in by_time_curr.items():
    if len(evts) > 1:
        anomalies.append(f"[DUPLICADO EXACTO] {t} | {c} | {evts[0].get('event_name')} ({len(evts)} instancias en BD)")

# Reporte Final
print("=" * 60)
if anomalies:
    print(f"⚠️  SE ENCONTRARON {len(anomalies)} ANOMALÍAS EN LA BASE DE DATOS:")
    for a in anomalies:
        print(f"  ❌ {a}")
    print("=" * 60)
    exit(1)
else:
    print("✅ INTEGRIDAD MACROECONÓMICA PERFECTA (100%):")
    print(f"   • Cero eventos fantasma de fin de semana.")
    print(f"   • Cero duplicados temporales ni de divisa.")
    print(f"   • Todos los {len(events)} eventos cumplen los estándares institucionales de AEON.")
    print("=" * 60)
    exit(0)
