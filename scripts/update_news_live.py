import os
import json
import urllib.request
from datetime import datetime, timezone

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
    'Content-Type': 'application/json'
}

now = datetime.now(timezone.utc)
time_str = now.strftime("%H:%M")

asian_news = [
    {
        "tag": "ORO",
        "title": "Oro (XAU/USD): Cotización spot consolidando en $4,598.06 con soporte firme en dPOC",
        "desc": f"El Oro Spot defiende los $4,598.06 en la apertura de Tokio, acumulando volumen sobre el Session VWAP intradía ($4,598.50). ⚡ IMPACTO: 🪙 XAU/USD: Nivel crítico en $4,570.00. Flujo comprador en metales preciosos durante la sesión asiática.",
        "link": "#",
        "time": time_str,
        "created_at": now.isoformat()
    },
    {
        "tag": "ASIA",
        "title": "Japón: IPC Subyacente de Tokio repunta al 2.2% e impulsa volatilidad en el Yen",
        "desc": f"El dato de inflación de Tokio supera expectativas (2.2% vs 2.1% est.), fortaleciendo al Yen y situando a USD/JPY en 159.35. ⚡ IMPACTO: 🇯🇵 USD/JPY (159.35): Resistencia en 159.55 con atención a declaraciones del Banco de Japón (BOJ).",
        "link": "#",
        "time": time_str,
        "created_at": now.isoformat()
    },
    {
        "tag": "ÍNDICES",
        "title": "Nikkei 225 y Asia-Pacífico absorben liquidez tras apertura mixta en Wall Street",
        "desc": f"El índice JP225 cotiza en 65,992 puntos con soporte en 65,375, mientras los futuros del S&P 500 consolidan en 7,719.40. ⚡ IMPACTO: 📈 Índices: Sesgo defensivo en renta variable con rotación hacia activos de refugio.",
        "link": "#",
        "time": time_str,
        "created_at": now.isoformat()
    },
    {
        "tag": "FED",
        "title": "Dólar Index (DXY): Estructura estable en 99.13 a la espera de peticiones de subsidio",
        "desc": f"El billete verde mantiene su rango sobre los 99.13 puntos mientras el mercado monitorea los próximos catalizadores de empleo en EE.UU. ⚡ IMPACTO: 🏛️ DXY (99.13): Estabilidad en yields de los bonos del Tesoro a 10 años.",
        "link": "#",
        "time": time_str,
        "created_at": now.isoformat()
    },
    {
        "tag": "FOREX",
        "title": "Divisas G10: EUR/USD cotiza en 1.1654 y GBP/USD en 1.3596 en rango equilibrado",
        "desc": f"Los principales cruces de divisas muestran baja volatilidad en la sesión de Tokio, respetando sus puntos de control de volumen dPOC. ⚡ IMPACTO: 💶 EUR/USD (1.1654): Soporte en 1.1639 con sesgo neutral.",
        "link": "#",
        "time": time_str,
        "created_at": now.isoformat()
    },
    {
        "tag": "CRIPTO",
        "title": "Bitcoin (BTC/USD): Expansión alcista sobre los $80,290 con volumen institucional",
        "desc": f"Bitcoin supera los $80,290 con un avance del +2.04% en 24h, estableciendo soporte clave en $78,940. ⚡ IMPACTO: ₿ BTC/USD: Objetivo técnico en resistencia $81,246 con RSI en zona de impulso.",
        "link": "#",
        "time": time_str,
        "created_at": now.isoformat()
    }
]

# 1. Limpiar tabla news
req_del = urllib.request.Request(
    f'{url}/rest/v1/news?id=neq.00000000-0000-0000-0000-000000000000',
    headers=headers,
    method='DELETE'
)
try:
    with urllib.request.urlopen(req_del) as resp_del:
        print("Noticias viejas eliminadas de Supabase. Status:", resp_del.status)
except Exception as e:
    print("Aviso al eliminar noticias:", e)

# 2. Insertar noticias frescas de la sesión
req_ins = urllib.request.Request(
    f'{url}/rest/v1/news',
    data=json.dumps(asian_news).encode('utf-8'),
    headers=headers,
    method='POST'
)

with urllib.request.urlopen(req_ins) as resp_ins:
    print(f"[OK] {len(asian_news)} Noticias frescas de la Sesion Asia-Pacifico insertadas en Supabase public.news! Status:", resp_ins.status)
