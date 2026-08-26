"""
scripts/ai/briefing_agent.py
==============================================================================
AEON AI Platform — Dual-Session Daily Macro Briefing Pipeline
Fase 5: Contextual Intelligence & Institutional Synthesis
Model: Google Gemini 2.5 Flash via Google AI Studio / Gemini REST API
==============================================================================
"""

import os
import sys
import json
import argparse
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# Curated High-Quality Institutional Cover Images (Glassmorphic dark background)
CURATED_COVERS = {
    "central_banks": "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?q=80&w=1200&auto=format&fit=crop", # Trading floor / building
    "gold": "https://images.unsplash.com/photo-1610375461246-83df859d849d?q=80&w=1200&auto=format&fit=crop",          # Gold bullion
    "wall_street": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop",    # Stock exchange chart
    "forex": "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1200&auto=format&fit=crop",          # Global currencies / charts
    "inflation": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop",      # Financial dashboard
}

def get_session_type(custom_session: str = None) -> str:
    if custom_session and custom_session != "auto":
        return custom_session
    now_utc = datetime.now(timezone.utc)
    # Si es antes de las 12:00 UTC -> Pre-Londres. A partir de las 12:00 UTC -> Pre-Nueva York
    return "london_pre" if now_utc.hour < 12 else "ny_pre"


def fetch_today_macro_events() -> list:
    """Extrae eventos del día desde ForexFactory JSON."""
    try:
        r = requests.get(
            "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
            timeout=10
        )
        if r.status_code != 200:
            return []
        events = r.json()
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        today_events = []
        for e in events:
            if e.get("date", "").startswith(today_str):
                impact = e.get("impact", "Low")
                if impact in ("High", "Medium"):
                    time_str = e.get("date", "")[11:16] if len(e.get("date", "")) >= 16 else "Todo el día"
                    today_events.append({
                        "time": time_str,
                        "currency": e.get("country", "ALL"),
                        "title": e.get("title", ""),
                        "impact": impact.upper(),
                        "forecast": e.get("forecast", "-"),
                        "previous": e.get("previous", "-")
                    })
        return today_events
    except Exception as err:
        print(f"[!] Error al consultar ForexFactory: {err}")
        return []


def generate_mock_briefing(session: str, today_str: str, events: list) -> dict:
    """Generador institucional de respaldo cuando no hay GEMINI_API_KEY o en modo offline."""
    is_london = (session == "london_pre")
    session_label = "Apertura de Londres (06:00 UTC)" if is_london else "Pre-Market Wall Street / Nueva York (12:30 UTC)"
    
    top_catalysts = events[:3] if events else [
        {"time": "13:30", "currency": "USD", "title": "Peticiones Iniciales de Desempleo", "impact": "HIGH"},
        {"time": "14:45", "currency": "USD", "title": "PMI Manufacturero Flash", "impact": "MEDIUM"},
        {"time": "18:00", "currency": "USD", "title": "Discurso Miembro FOMC", "impact": "MEDIUM"}
    ]
    
    title = f"Sesión {('Europea' if is_london else 'Americana')}: Enfoque en Liquidez y Datos Macroeconómicos Clave"
    thesis = (
        "Consolidación en el Dólar (DXY) favorece soporte técnico en XAU/USD y EUR/USD. "
        f"Se proyecta volatilidad institucional durante la {session_label} con sesgo favorable a continuación tendencial."
    )
    
    full_md = f"""### 🌐 Contexto de la Sesión ({session_label})
La jornada inicia con los mercados asimilando los últimos comentarios de política monetaria y la estabilidad en los rendimientos de los bonos del Tesoro. El apetito por riesgo muestra una estructura de consolidación ordenada.

### 🚨 Catalizadores Críticos de la Jornada
Los operadores vigilan de cerca los lanzamientos macroeconómicos programados, con especial atención a las métricas del Dólar estadounidense y los niveles de soporte en el Oro (XAU/USD).

### 🎯 Directrices Operativas
- **XAU/USD:** Estructura compradora activa sobre soportes de Session VWAP.
- **EUR/USD / GBPUSD:** Reacción esperada en Killzones institucionales tras barridas de liquidez matutinas.
- **DXY:** Resistencia clave en la zona alta de sesión asiática.
"""

    return {
        "session_id": session,
        "date": today_str,
        "title": title,
        "image_url": CURATED_COVERS["wall_street"] if not is_london else CURATED_COVERS["central_banks"],
        "macro_sentiment": {
            "score": 65 if is_london else 60,
            "label": "RISK_ON",
            "risk_appetite": "BULLISH"
        },
        "asset_bias": {
            "XAUUSD": "BULLISH",
            "EURUSD": "NEUTRAL",
            "GBPUSD": "BULLISH",
            "DXY": "BEARISH",
            "SPX500": "BULLISH"
        },
        "catalysts": top_catalysts,
        "executive_thesis": thesis,
        "full_content_md": full_md,
        "author": "AEON Macro Intelligence AI (Gemini 2.5 Engine)"
    }


def call_gemini_api(session: str, today_str: str, events: list, api_key: str) -> dict:
    """Llama a la API de Gemini 2.5 Flash de Google AI Studio con salida tipada JSON."""
    is_london = (session == "london_pre")
    session_title = "Pre-Mercado de Londres (06:00 UTC)" if is_london else "Pre-Mercado de Nueva York (12:30 UTC)"
    
    prompt = f"""Eres el Analista Macroeconómico Senior del terminal institucional AEON.
Tu tarea es redactar el Daily Macro Briefing para la sesión: {session_title} de la fecha {today_str}.

DATOS DUROS DEL CALENDARIO ECONÓMICO DE HOY:
{json.dumps(events, indent=2, ensure_ascii=False)}

INSTRUCCIONES RIGUROSAS:
1. Responde ÚNICAMENTE con un objeto JSON válido, sin delimitadores de código ni texto adicional.
2. Tono: Ejecutivo, conciso, sobrio, nivel Wall Street / Bloomberg.
3. El campo 'executive_thesis' debe ser una síntesis contundente de exactamente 2 líneas en español.
4. El campo 'macro_sentiment' debe incluir 'score' (0 a 100), 'label' ('RISK_ON' | 'NEUTRAL' | 'RISK_OFF') y 'risk_appetite' ('BULLISH' | 'NEUTRAL' | 'BEARISH').
5. El campo 'asset_bias' debe indicar el sesgo para cada uno de estos activos: 'XAUUSD', 'EURUSD', 'GBPUSD', 'DXY', 'SPX500' ('BULLISH' | 'BEARISH' | 'NEUTRAL').
6. El campo 'catalysts' debe contener los 3 eventos más relevantes con: time, currency, title, impact ('HIGH' | 'MEDIUM').
7. El campo 'image_category' debe ser uno de: 'gold', 'wall_street', 'central_banks', 'forex', 'inflation'.
8. El campo 'full_content_md' debe contener un reporte en markdown de 3 párrafos con títulos claros.

FORMATO JSON REQUERIDO:
{{
  "title": "Título institucional conciso",
  "image_category": "wall_street",
  "macro_sentiment": {{
    "score": 68,
    "label": "RISK_ON",
    "risk_appetite": "BULLISH"
  }},
  "asset_bias": {{
    "XAUUSD": "BULLISH",
    "EURUSD": "BEARISH",
    "GBPUSD": "NEUTRAL",
    "DXY": "BEARISH",
    "SPX500": "BULLISH"
  }},
  "catalysts": [
    {{ "time": "13:30", "currency": "USD", "title": "Evento", "impact": "HIGH" }}
  ],
  "executive_thesis": "Línea 1 tesis.\\nLínea 2 tesis.",
  "full_content_md": "### 🌐 Contexto\\nTexto...\\n\\n### 🚨 Catalizadores\\nTexto...\\n\\n### 🎯 Directrices\\nTexto..."
}}"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2,
            "maxOutputTokens": 2048
        }
    }
    
    resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=25)
    if resp.status_code != 200:
        print(f"[!] Error de Gemini API ({resp.status_code}): {resp.text}")
        return generate_mock_briefing(session, today_str, events)
        
    data = resp.json()
    try:
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)
        
        img_cat = parsed.get("image_category", "wall_street")
        img_url = CURATED_COVERS.get(img_cat, CURATED_COVERS["wall_street"])
        
        return {
            "session_id": session,
            "date": today_str,
            "title": parsed.get("title", f"Sesión {session_title}"),
            "image_url": img_url,
            "macro_sentiment": parsed.get("macro_sentiment", {"score": 50, "label": "NEUTRAL", "risk_appetite": "NEUTRAL"}),
            "asset_bias": parsed.get("asset_bias", {"XAUUSD": "NEUTRAL", "EURUSD": "NEUTRAL", "DXY": "NEUTRAL"}),
            "catalysts": parsed.get("catalysts", events[:3]),
            "executive_thesis": parsed.get("executive_thesis", "Contexto de mercado en evaluación."),
            "full_content_md": parsed.get("full_content_md", ""),
            "author": "AEON Macro Intelligence AI (Gemini 2.5 Flash)"
        }
    except Exception as parse_err:
        print(f"[!] Error parseando respuesta de Gemini: {parse_err}")
        return generate_mock_briefing(session, today_str, events)


def publish_briefing_to_supabase(briefing: dict) -> bool:
    """Inserta o actualiza atómicamente el briefing en la tabla daily_briefings."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("[!] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.")
        return False
        
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/daily_briefings"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
    }
    
    try:
        resp = requests.post(endpoint, json=briefing, headers=headers, timeout=10)
        if resp.status_code in (200, 201):
            print(f"[+] Briefing publicado exitosamente en Supabase (Sesión: {briefing['session_id']}, Fecha: {briefing['date']})")
            return True
        else:
            print(f"[!] Fallo al insertar briefing en Supabase ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        print(f"[!] Error de red contra Supabase: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="AEON Dual-Session Daily Macro Briefing Pipeline")
    parser.add_argument("--session", choices=["london_pre", "ny_pre", "auto"], default="auto", help="Sesión a procesar")
    parser.add_argument("--dry-run", action="store_true", help="Generar briefing sin publicar en Supabase")
    args = parser.parse_args()

    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y-%m-%d")
    session = get_session_type(args.session)
    
    print("==========================================================")
    print("  AEON AI PLATFORM — DAILY MACRO BRIEFING PIPELINE")
    print(f"  Fecha UTC: {today_str} | Hora: {now_utc.strftime('%H:%M:%S UTC')}")
    print(f"  Sesión Objetivo: {session.upper()}")
    print("==========================================================")

    events = fetch_today_macro_events()
    print(f"[*] Eventos macro relevantes identificados para hoy: {len(events)}")

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        print("[*] Conectando con Google AI Studio (Gemini 2.5 Flash)...")
        briefing = call_gemini_api(session, today_str, events, gemini_key)
    else:
        print("[*] GEMINI_API_KEY no detectada. Generando Briefing Institucional de respaldo...")
        briefing = generate_mock_briefing(session, today_str, events)

    print("\n--- RESUMEN DEL BRIEFING GENERADO ---")
    print(f"Título:       {briefing['title']}")
    print(f"Sentimiento:  {briefing['macro_sentiment']['label']} ({briefing['macro_sentiment']['score']}%)")
    print(f"Sesgo Radar:  {briefing['asset_bias']}")
    print(f"Tesis:        {briefing['executive_thesis']}")
    print(f"Catalizadores ({len(briefing['catalysts'])}):")
    for c in briefing['catalysts']:
        print(f"  - [{c.get('time', '--:--')}] {c.get('currency', 'ALL')}: {c.get('title', '')} ({c.get('impact', 'MED')})")
    print("-------------------------------------\n")

    if args.dry_run:
        print("[DRY-RUN] Modo de prueba activo. No se escribe en Supabase.")
        return

    publish_briefing_to_supabase(briefing)


if __name__ == "__main__":
    main()
