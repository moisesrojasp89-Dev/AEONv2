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

# Calendario Macroeconómico Completo Institucional de Septiembre 2026 (Semanas 2, 3, 4 y Cierre)
full_september_events = [
    # ── SEMANA 2: 7 al 11 de Septiembre ──
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-07-cny-trade")),
        "event_time": "2026-09-07T03:00:00+00:00",
        "country": "CNY",
        "event_name": "Trade Balance USD",
        "impact": "Medium",
        "actual": None,
        "forecast": "85.2B",
        "previous": "84.6B"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-08-eur-gdp-final")),
        "event_time": "2026-09-08T09:00:00+00:00",
        "country": "EUR",
        "event_name": "Final Employment Change q/q",
        "impact": "Medium",
        "actual": None,
        "forecast": "0.2%",
        "previous": "0.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-09-usd-trade")),
        "event_time": "2026-09-09T12:30:00+00:00",
        "country": "USD",
        "event_name": "Trade Balance",
        "impact": "Medium",
        "actual": None,
        "forecast": "-72.5B",
        "previous": "-73.1B"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-10-eur-ecb-rate")),
        "event_time": "2026-09-10T12:15:00+00:00",
        "country": "EUR",
        "event_name": "ECB Main Refinancing Rate Decision",
        "impact": "High",
        "actual": None,
        "forecast": "3.50%",
        "previous": "3.75%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-10-eur-ecb-press")),
        "event_time": "2026-09-10T12:45:00+00:00",
        "country": "EUR",
        "event_name": "ECB Monetary Policy Statement & Press Conference",
        "impact": "High",
        "actual": None,
        "forecast": None,
        "previous": None
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-10-usd-cpi-mm")),
        "event_time": "2026-09-10T12:30:00+00:00",
        "country": "USD",
        "event_name": "CPI m/m (IPC Mensual)",
        "impact": "High",
        "actual": None,
        "forecast": "0.2%",
        "previous": "0.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-10-usd-cpi-yy")),
        "event_time": "2026-09-10T12:30:00+00:00",
        "country": "USD",
        "event_name": "CPI y/y (IPC Interanual)",
        "impact": "High",
        "actual": None,
        "forecast": "2.8%",
        "previous": "2.9%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-10-usd-core-cpi")),
        "event_time": "2026-09-10T12:30:00+00:00",
        "country": "USD",
        "event_name": "Core CPI m/m (IPC Subyacente)",
        "impact": "High",
        "actual": None,
        "forecast": "0.2%",
        "previous": "0.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-10-usd-claims")),
        "event_time": "2026-09-10T12:30:00+00:00",
        "country": "USD",
        "event_name": "Unemployment Claims",
        "impact": "Medium",
        "actual": None,
        "forecast": "228K",
        "previous": "232K"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-11-gbp-gdp-m")),
        "event_time": "2026-09-11T06:00:00+00:00",
        "country": "GBP",
        "event_name": "GDP m/m (PIB Mensual Reino Unido)",
        "impact": "High",
        "actual": None,
        "forecast": "0.2%",
        "previous": "0.0%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-11-usd-ppi")),
        "event_time": "2026-09-11T12:30:00+00:00",
        "country": "USD",
        "event_name": "PPI m/m (IPP Precios Productor)",
        "impact": "High",
        "actual": None,
        "forecast": "0.2%",
        "previous": "0.1%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-11-usd-uom-prelim")),
        "event_time": "2026-09-11T14:00:00+00:00",
        "country": "USD",
        "event_name": "Prelim UoM Consumer Sentiment",
        "impact": "High",
        "actual": None,
        "forecast": "68.5",
        "previous": "67.8"
    },

    # ── SEMANA 3: 14 al 18 de Septiembre (SUPER SEMANA DE BANCOS CENTRALES: FED + BOE + BOJ) ──
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-15-usd-retail-sales")),
        "event_time": "2026-09-15T12:30:00+00:00",
        "country": "USD",
        "event_name": "Retail Sales m/m (Ventas Minoristas)",
        "impact": "High",
        "actual": None,
        "forecast": "0.3%",
        "previous": "1.0%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-15-usd-core-retail")),
        "event_time": "2026-09-15T12:30:00+00:00",
        "country": "USD",
        "event_name": "Core Retail Sales m/m",
        "impact": "High",
        "actual": None,
        "forecast": "0.2%",
        "previous": "0.4%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-15-cad-cpi")),
        "event_time": "2026-09-15T12:30:00+00:00",
        "country": "CAD",
        "event_name": "CPI m/m (IPC Canadá)",
        "impact": "High",
        "actual": None,
        "forecast": "0.1%",
        "previous": "0.4%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-16-gbp-cpi")),
        "event_time": "2026-09-16T06:00:00+00:00",
        "country": "GBP",
        "event_name": "CPI y/y (IPC Reino Unido)",
        "impact": "High",
        "actual": None,
        "forecast": "2.2%",
        "previous": "2.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-16-eur-cpi-final")),
        "event_time": "2026-09-16T09:00:00+00:00",
        "country": "EUR",
        "event_name": "Final CPI y/y (IPC Final Eurozona)",
        "impact": "High",
        "actual": None,
        "forecast": "2.2%",
        "previous": "2.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-16-usd-fomc-rate")),
        "event_time": "2026-09-16T18:00:00+00:00", # 14:00 ET (DECISIÓN DE TIPOS FOMC FED)
        "country": "USD",
        "event_name": "FOMC Statement & Federal Funds Rate Decision",
        "impact": "High",
        "actual": None,
        "forecast": "5.25%",
        "previous": "5.50%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-16-usd-fomc-projections")),
        "event_time": "2026-09-16T18:00:00+00:00", # 14:00 ET (PROYECCIONES ECONÓMICAS FOMC / DOT PLOT)
        "country": "USD",
        "event_name": "FOMC Economic Projections (Dot Plot)",
        "impact": "High",
        "actual": None,
        "forecast": None,
        "previous": None
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-16-usd-fomc-press")),
        "event_time": "2026-09-16T18:30:00+00:00", # 14:30 ET (RUEDA DE PRENSA JEROME POWELL)
        "country": "USD",
        "event_name": "FOMC Press Conference (Jerome Powell)",
        "impact": "High",
        "actual": None,
        "forecast": None,
        "previous": None
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-17-aud-employment")),
        "event_time": "2026-09-17T01:30:00+00:00",
        "country": "AUD",
        "event_name": "Employment Change & Unemployment Rate",
        "impact": "High",
        "actual": None,
        "forecast": "20.5K",
        "previous": "58.2K"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-17-gbp-boe-rate")),
        "event_time": "2026-09-17T11:00:00+00:00", # 07:00 ET (DECISIÓN DE TIPOS BANCO DE INGLATERRA)
        "country": "GBP",
        "event_name": "Bank of England (BoE) Official Bank Rate Decision",
        "impact": "High",
        "actual": None,
        "forecast": "5.00%",
        "previous": "5.00%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-17-usd-claims-2")),
        "event_time": "2026-09-17T12:30:00+00:00",
        "country": "USD",
        "event_name": "Unemployment Claims",
        "impact": "Medium",
        "actual": None,
        "forecast": "229K",
        "previous": "228K"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-17-usd-philly")),
        "event_time": "2026-09-17T12:30:00+00:00",
        "country": "USD",
        "event_name": "Philly Fed Manufacturing Index",
        "impact": "Medium",
        "actual": None,
        "forecast": "1.2",
        "previous": "-7.0"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-18-jpy-boj-rate")),
        "event_time": "2026-09-18T03:30:00+00:00", # Madrugada ET (DECISIÓN DE TIPOS BANCO DE JAPÓN)
        "country": "JPY",
        "event_name": "Bank of Japan (BoJ) Policy Rate Decision",
        "impact": "High",
        "actual": None,
        "forecast": "0.25%",
        "previous": "0.25%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-18-jpy-boj-press")),
        "event_time": "2026-09-18T06:30:00+00:00",
        "country": "JPY",
        "event_name": "BOJ Press Conference (Governor Kazuo Ueda)",
        "impact": "High",
        "actual": None,
        "forecast": None,
        "previous": None
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-18-gbp-retail")),
        "event_time": "2026-09-18T06:00:00+00:00",
        "country": "GBP",
        "event_name": "Retail Sales m/m (Ventas Minoristas UK)",
        "impact": "High",
        "actual": None,
        "forecast": "0.4%",
        "previous": "0.5%"
    },

    # ── SEMANA 4: 21 al 25 de Septiembre (FLASH PMIS & CORE PCE DE LA FED) ──
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-23-eur-flash-pmi")),
        "event_time": "2026-09-23T08:00:00+00:00",
        "country": "EUR",
        "event_name": "Eurozone Flash Manufacturing & Services PMI",
        "impact": "High",
        "actual": None,
        "forecast": "51.2",
        "previous": "50.8"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-23-gbp-flash-pmi")),
        "event_time": "2026-09-23T08:30:00+00:00",
        "country": "GBP",
        "event_name": "UK Flash Manufacturing & Services PMI",
        "impact": "High",
        "actual": None,
        "forecast": "53.0",
        "previous": "52.8"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-23-usd-flash-pmi")),
        "event_time": "2026-09-23T13:45:00+00:00",
        "country": "USD",
        "event_name": "S&P Global Flash Manufacturing & Services PMI",
        "impact": "High",
        "actual": None,
        "forecast": "54.8",
        "previous": "54.3"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-24-usd-gdp-final")),
        "event_time": "2026-09-24T12:30:00+00:00",
        "country": "USD",
        "event_name": "Final GDP q/q (PIB Final Q2 EE.UU.)",
        "impact": "High",
        "actual": None,
        "forecast": "2.8%",
        "previous": "2.8%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-24-usd-claims-3")),
        "event_time": "2026-09-24T12:30:00+00:00",
        "country": "USD",
        "event_name": "Unemployment Claims",
        "impact": "Medium",
        "actual": None,
        "forecast": "225K",
        "previous": "229K"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-24-usd-durable")),
        "event_time": "2026-09-24T12:30:00+00:00",
        "country": "USD",
        "event_name": "Core Durable Goods Orders m/m",
        "impact": "High",
        "actual": None,
        "forecast": "0.1%",
        "previous": "-0.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-25-usd-core-pce-mm")),
        "event_time": "2026-09-25T12:30:00+00:00", # 08:30 ET (CORE PCE PRICE INDEX - INFLACIÓN PREFERIDA FED)
        "country": "USD",
        "event_name": "Core PCE Price Index m/m",
        "impact": "High",
        "actual": None,
        "forecast": "0.2%",
        "previous": "0.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-25-usd-core-pce-yy")),
        "event_time": "2026-09-25T12:30:00+00:00",
        "country": "USD",
        "event_name": "Core PCE Price Index y/y",
        "impact": "High",
        "actual": None,
        "forecast": "2.6%",
        "previous": "2.6%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-25-usd-pers-income")),
        "event_time": "2026-09-25T12:30:00+00:00",
        "country": "USD",
        "event_name": "Personal Income & Spending m/m",
        "impact": "Medium",
        "actual": None,
        "forecast": "0.4%",
        "previous": "0.3%"
    },

    # ── SEMANA 5 / CIERRE DE MES: 28 al 30 de Septiembre ──
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-29-usd-cb-consumer")),
        "event_time": "2026-09-29T14:00:00+00:00",
        "country": "USD",
        "event_name": "CB Consumer Confidence (Confianza del Consumidor)",
        "impact": "High",
        "actual": None,
        "forecast": "100.5",
        "previous": "100.3"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-29-usd-jolts-aug")),
        "event_time": "2026-09-29T14:00:00+00:00",
        "country": "USD",
        "event_name": "JOLTS Job Openings (Ofertas de Empleo)",
        "impact": "High",
        "actual": None,
        "forecast": "7.88M",
        "previous": "7.95M"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-30-jpy-tokyo-cpi")),
        "event_time": "2026-09-29T23:30:00+00:00", # 19:30 ET / Tokio 08:30
        "country": "JPY",
        "event_name": "Tokyo Core CPI y/y (IPC Subyacente de Tokio)",
        "impact": "High",
        "actual": None,
        "forecast": "2.0%",
        "previous": "1.8%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-30-cad-gdp-m")),
        "event_time": "2026-09-30T12:30:00+00:00",
        "country": "CAD",
        "event_name": "GDP m/m (PIB Mensual Canadá)",
        "impact": "High",
        "actual": None,
        "forecast": "0.1%",
        "previous": "0.2%"
    },
    {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "aeon-cal-2026-09-30-usd-chicago")),
        "event_time": "2026-09-30T13:45:00+00:00",
        "country": "USD",
        "event_name": "Chicago PMI (Cierre de Trimestre)",
        "impact": "Medium",
        "actual": None,
        "forecast": "46.0",
        "previous": "45.2"
    }
]

now_iso = datetime.now(timezone.utc).isoformat()
for e in full_september_events:
    e['created_at'] = now_iso
    e['updated_at'] = now_iso

print(f"[*] Inyectando {len(full_september_events)} eventos institucionales para completar el mes de Septiembre 2026...")

try:
    req = urllib.request.Request(
        f"{url}/rest/v1/economic_calendar?on_conflict=id",
        data=json.dumps(full_september_events).encode('utf-8'),
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
for e in full_september_events:
    events_dict[e['id']] = e

all_events_sorted = sorted(events_dict.values(), key=lambda x: x['event_time'])

with open(snap_path, 'w', encoding='utf-8') as f:
    json.dump(all_events_sorted, f, indent=2, ensure_ascii=False)

print(f"[OK] Snapshot local actualizado con {len(all_events_sorted)} eventos totales.")
