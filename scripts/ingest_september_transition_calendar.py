import json
import uuid
import urllib.request
import os
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

# Eventos Macroestructurales de la Semana de Transición: 31 de Agosto al 5 de Septiembre 2026
# (Cierre de Agosto + Inicio de Septiembre con NFP, ISM y Tasas)
new_events = [
    # Lunes 31 de Agosto 2026 (Fin de Mes)
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-08-31-jpy-retail")),
        "event_time": "2026-08-30T23:50:00+00:00", # Domingo 19:50 ET / Lunes 08:50 Tokio
        "country": "JPY",
        "event_name": "Retail Sales y/y",
        "impact": "Medium",
        "actual": None,
        "forecast": "1.2%",
        "previous": "1.5%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-08-31-cny-pmi")),
        "event_time": "2026-08-31T01:30:00+00:00", # Lunes 09:30 Beijing
        "country": "CNY",
        "event_name": "Manufacturing PMI",
        "impact": "High",
        "actual": None,
        "forecast": "49.5",
        "previous": "49.4",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-08-31-ger-cpi")),
        "event_time": "2026-08-31T12:00:00+00:00", # Lunes 14:00 Berlín / 08:00 ET
        "country": "EUR",
        "event_name": "German Prelim CPI m/m",
        "impact": "High",
        "actual": None,
        "forecast": "0.1%",
        "previous": "0.3%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-08-31-usd-chicago")),
        "event_time": "2026-08-31T13:45:00+00:00", # Lunes 09:45 ET
        "country": "USD",
        "event_name": "Chicago PMI",
        "impact": "Medium",
        "actual": None,
        "forecast": "45.2",
        "previous": "45.3",
    },

    # Martes 1 de Septiembre 2026 (Inicio de Mes)
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-01-aud-rba")),
        "event_time": "2026-09-01T04:30:00+00:00", # Martes 14:30 Sydney / 00:30 ET
        "country": "AUD",
        "event_name": "RBA Rate Statement & Cash Rate",
        "impact": "High",
        "actual": None,
        "forecast": "4.35%",
        "previous": "4.35%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-01-eur-pmi")),
        "event_time": "2026-09-01T08:00:00+00:00", # Martes 10:00 Frankfurt / 04:00 ET
        "country": "EUR",
        "event_name": "Final Manufacturing PMI",
        "impact": "High",
        "actual": None,
        "forecast": "45.8",
        "previous": "45.6",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-01-gbp-pmi")),
        "event_time": "2026-09-01T08:30:00+00:00", # Martes 09:30 Londres / 04:30 ET
        "country": "GBP",
        "event_name": "Final Manufacturing PMI",
        "impact": "High",
        "actual": None,
        "forecast": "52.5",
        "previous": "52.1",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-01-usd-ism")),
        "event_time": "2026-09-01T14:00:00+00:00", # Martes 10:00 ET
        "country": "USD",
        "event_name": "ISM Manufacturing PMI",
        "impact": "High",
        "actual": None,
        "forecast": "47.8",
        "previous": "46.8",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-01-usd-prices")),
        "event_time": "2026-09-01T14:00:00+00:00", # Martes 10:00 ET
        "country": "USD",
        "event_name": "ISM Manufacturing Prices",
        "impact": "Medium",
        "actual": None,
        "forecast": "52.5",
        "previous": "52.9",
    },

    # Miércoles 2 de Septiembre 2026
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-02-aud-gdp")),
        "event_time": "2026-09-02T01:30:00+00:00", # Miércoles 11:30 Sydney / 21:30 ET (Martes)
        "country": "AUD",
        "event_name": "GDP q/q",
        "impact": "High",
        "actual": None,
        "forecast": "0.3%",
        "previous": "0.1%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-02-usd-adp")),
        "event_time": "2026-09-02T12:15:00+00:00", # Miércoles 08:15 ET
        "country": "USD",
        "event_name": "ADP Non-Farm Employment Change",
        "impact": "High",
        "actual": None,
        "forecast": "145K",
        "previous": "122K",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-02-usd-jolts")),
        "event_time": "2026-09-02T14:00:00+00:00", # Miércoles 10:00 ET
        "country": "USD",
        "event_name": "JOLTS Job Openings",
        "impact": "High",
        "actual": None,
        "forecast": "7.95M",
        "previous": "8.18M",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-02-usd-factory")),
        "event_time": "2026-09-02T14:00:00+00:00", # Miércoles 10:00 ET
        "country": "USD",
        "event_name": "Factory Orders m/m",
        "impact": "Medium",
        "actual": None,
        "forecast": "4.8%",
        "previous": "-3.3%",
    },

    # Jueves 3 de Septiembre 2026
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-03-cny-services")),
        "event_time": "2026-09-03T01:45:00+00:00", # Jueves 09:45 Beijing
        "country": "CNY",
        "event_name": "Caixin Services PMI",
        "impact": "Medium",
        "actual": None,
        "forecast": "52.1",
        "previous": "52.1",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-03-eur-ppi")),
        "event_time": "2026-09-03T09:00:00+00:00", # Jueves 11:00 Frankfurt / 05:00 ET
        "country": "EUR",
        "event_name": "PPI m/m",
        "impact": "Medium",
        "actual": None,
        "forecast": "0.3%",
        "previous": "0.5%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-03-usd-claims")),
        "event_time": "2026-09-03T12:30:00+00:00", # Jueves 08:30 ET
        "country": "USD",
        "event_name": "Unemployment Claims",
        "impact": "High",
        "actual": None,
        "forecast": "232K",
        "previous": "231K",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-03-usd-services-ism")),
        "event_time": "2026-09-03T14:00:00+00:00", # Jueves 10:00 ET
        "country": "USD",
        "event_name": "ISM Services PMI",
        "impact": "High",
        "actual": None,
        "forecast": "51.4",
        "previous": "51.4",
    },

    # Viernes 4 de Septiembre 2026 (NFP Super Friday)
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-04-eur-gdp")),
        "event_time": "2026-09-04T09:00:00+00:00", # Viernes 11:00 Frankfurt / 05:00 ET
        "country": "EUR",
        "event_name": "Revised GDP q/q",
        "impact": "Medium",
        "actual": None,
        "forecast": "0.3%",
        "previous": "0.3%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-04-usd-nfp")),
        "event_time": "2026-09-04T12:30:00+00:00", # Viernes 08:30 ET (NÓMINAS NO AGRÍCOLAS)
        "country": "USD",
        "event_name": "Non-Farm Employment Change",
        "impact": "High",
        "actual": None,
        "forecast": "164K",
        "previous": "114K",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-04-usd-unemployment")),
        "event_time": "2026-09-04T12:30:00+00:00", # Viernes 08:30 ET (TASA DE DESEMPLEO)
        "country": "USD",
        "event_name": "Unemployment Rate",
        "impact": "High",
        "actual": None,
        "forecast": "4.2%",
        "previous": "4.3%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-04-usd-hourly-earnings")),
        "event_time": "2026-09-04T12:30:00+00:00", # Viernes 08:30 ET (SALARIOS MEDIOS)
        "country": "USD",
        "event_name": "Average Hourly Earnings m/m",
        "impact": "High",
        "actual": None,
        "forecast": "0.3%",
        "previous": "0.2%",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-04-cad-employment")),
        "event_time": "2026-09-04T12:30:00+00:00", # Viernes 08:30 ET (EMPLEO CANADÁ)
        "country": "CAD",
        "event_name": "Employment Change",
        "impact": "High",
        "actual": None,
        "forecast": "25.0K",
        "previous": "-2.8K",
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-04-cad-rate")),
        "event_time": "2026-09-04T12:30:00+00:00", # Viernes 08:30 ET (TASA DESEMPLEO CANADÁ)
        "country": "CAD",
        "event_name": "Unemployment Rate",
        "impact": "High",
        "actual": None,
        "forecast": "6.5%",
        "previous": "6.4%",
    }
]

now_iso = datetime.now(timezone.utc).isoformat()
for e in new_events:
    e['created_at'] = now_iso
    e['updated_at'] = now_iso

print(f"[*] Insertando {len(new_events)} eventos macro para la semana 31/08 - 05/09 en Supabase...")

try:
    req = urllib.request.Request(
        f"{url}/rest/v1/economic_calendar?on_conflict=id",
        data=json.dumps(new_events).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(f"[OK] Supabase actualizado exitosamente (Status: {resp.status})")
except Exception as ex:
    print("[WARN] Error al insertar en Supabase:", ex)

# 2. Actualizar snapshot local en src/data/economic_calendar_snapshot.json
snap_path = os.path.join('src', 'data', 'economic_calendar_snapshot.json')
existing_events = []
if os.path.exists(snap_path):
    with open(snap_path, encoding='utf-8') as f:
        existing_events = json.load(f)

# Merge por ID
events_dict = {e['id']: e for e in existing_events}
for e in new_events:
    events_dict[e['id']] = e

all_events_sorted = sorted(events_dict.values(), key=lambda x: x['event_time'])

with open(snap_path, 'w', encoding='utf-8') as f:
    json.dump(all_events_sorted, f, indent=2, ensure_ascii=False)

print(f"[OK] Snapshot local actualizado con {len(all_events_sorted)} eventos totales.")
