import urllib.request
import json
import os
import xml.etree.ElementTree as ET
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
gemini_key = env.get('GEMINI_API_KEY', '')

# 1. Obtener los últimos datos reales del calendario
cal_events = []
cal_path = os.path.join('src', 'data', 'economic_calendar_snapshot.json')
if os.path.exists(cal_path):
    with open(cal_path, encoding='utf-8') as f:
        cal_events = json.load(f)

cal_summary = []
for ev in cal_events:
    act = ev.get('actual')
    if act and act not in ('Pendiente', '—', 'None', ''):
        cal_summary.append(f"{ev.get('country')} {ev.get('event_name')}: Actual={act} (Consenso={ev.get('forecast')}, Previo={ev.get('previous')})")

cal_summary = cal_summary[-6:] # últimos 6 eventos reales

# 2. Prompt estricto a Gemini 2.5 Flash
prompt = f"""
Actúa como el Agente Cuantitativo y Macro de Noticias de la firma Fintech AEON.
Genera exactamente 5 noticias financieras institucionales en formato JSON para el panel de noticias en tiempo real.

DATOS VERIFICADOS DISPONIBLES EN VIVO:
- Cotizaciones Reales: Oro Spot ($4,454.99 - Bearish), Dólar Index DXY (99.68 - Bullish), S&P 500 (7,714.95), Bitcoin ($78,238 - Cripto 24/7), EUR/USD (1.1597), USD/JPY (159.98).
- Datos Económicos Reales Publicados: {', '.join(cal_summary)}
- Sesión Activa: Resumen Semanal & Cierre de Mercados (Fin de semana: Forex/Índices cerrados, Bitcoin activo 24/7).

REGLAS DE ORO DE VERACIDAD (CERO ALUCINACIONES):
1. Debes generar exactamente 1 noticia por cada una de las 5 categorías: 'METALES', 'FOREX', 'ÍNDICES', 'FED', 'CRIPTO'.
2. Si mencionas datos económicos (IPC de Tokio, Nóminas, PCE, Confianza), USA ÚNICAMENTE los números exactos de la lista de 'Datos Económicos Reales Publicados' (ej. IPC de Tokio es 1.8%, no inventes 2.2%).
3. En el campo 'desc' incluye siempre el análisis de Order Flow con la etiqueta: '⚡ IMPACTO: [Emoji] [Activo]: [Nivel técnico o zona dPOC].'
4. Retorna EXCLUSIVAMENTE el array JSON válido sin bloques markdown ni texto extra.

Formato requerido:
[
  {{
    "tag": "METALES",
    "title": "Oro Spot (XAU/USD): Cierre semanal defensivo en $4,454.99 tras presión de rendimientos",
    "desc": "El Oro consolida en soportes clave de cara al fin de semana. ⚡ IMPACTO: 🪙 XAU/USD: Nivel dPOC en $4,454.99."
  }}
]
"""

gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
payload = {
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 800}
}

req_ai = urllib.request.Request(gemini_url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_ai, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    raw_text = data['candidates'][0]['content']['parts'][0]['text'].strip()
    if raw_text.startswith('```json'):
        raw_text = raw_text[7:]
    if raw_text.startswith('```'):
        raw_text = raw_text[3:]
    if raw_text.endswith('```'):
        raw_text = raw_text[:-3]
    news_parsed = json.loads(raw_text.strip())
    print("\n=== NOTICIAS GENERADAS POR GEMINI 2.5 FLASH ===")
    for n in news_parsed:
        print(f"\n[{n.get('tag')}] {n.get('title')}")
        print(f"-> {n.get('desc')}")
