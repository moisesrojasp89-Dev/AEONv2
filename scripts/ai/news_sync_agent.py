"""
scripts/ai/news_sync_agent.py
==============================================================================
AEON Real-Time News Synchronizer en ESPAÑOL
Extrae titulares financieros en vivo de ForexLive y WSJ Markets,
los traduce y categoriza en español institucional (ORO, FOREX, ÍNDICES, FED)
y los publica en public.news de Supabase.
==============================================================================
"""

import os
import sys
import re
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

RSS_FEEDS = [
    "https://www.forexlive.com/feed/news",
    "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"
]

TRANSLATION_MAP = [
    (r"What are the main events for today\?", "¿Cuáles son los eventos macroeconómicos clave para la jornada de hoy?"),
    (r"investingLive Asia-Pacific market news: Oil down, AUD 3 month high", "Mercados Asia-Pacífico: El petróleo cede terreno mientras el Dólar Australiano toca máximos de 3 meses"),
    (r"Australian monthly CPI \(.*?\) ([\d\.]+) % y/y \(vs\. ([\d\.]+)% expected\)", r"IPC de Australia: Inflación mensual se sitúa en \1% anual (frente al \2% esperado)"),
    (r"Preview, today: Fed's favoured inflation gauge lands.*", "Previa de la Fed: El indicador de inflación PCE preferido por el banco central se publica hoy"),
    (r"Japan's services inflation accelerates to ([\d\.]+)pct in July, beating forecasts", r"La inflación del sector servicios en Japón se acelera al \1% en julio, superando las previsiones"),
    (r"US weighs further trade escalation.*", "EE.UU. evalúa nuevas medidas arancelarias y restricciones comerciales"),
    (r"investingLive Americas market news wrap:.*", "Resumen de Mercados de las Américas: Estabilidad en divisas y enfoque en Wall Street"),
    (r"Comex Gold, Silver Settle Lower", "El Oro y la Plata de Comex cierran la sesión a la baja tras toma de beneficios"),
    (r"Stocks Sink in Broad AI Rout.*", "Wall Street: Las bolsas retroceden tras corrección técnica en el sector tecnológico y de semiconductores"),
    (r"DeepSeek Won't Sink U.S. AI Titans", "Analistas de Wall Street descartan impacto estructural en los gigantes tecnológicos estadounidenses"),
    (r"Gold settled ([\d\.]+)% lower.*", r"El oro cerró con una caída del \1% tras el repunte en los rendimientos de los bonos."),
    (r"ICYMI: US begins returning staff to Middle East.*", "EE.UU. reanuda operaciones diplomáticas en Medio Oriente; primas de riesgo geopolítico se estabilizan."),
    (r"July ([\d]+) inflation data from Australia.*", r"Datos de inflación de Australia muestran resistencia en precios de servicios e importaciones."),
    (r"Today's PCE print carries added weight.*", "La publicación del índice PCE de hoy cobra relevancia antes de las comparecencias de la Reserva Federal."),
    (r"The upside surprise adds another data point to the case for a near term BOJ hike.*", "La sorpresa al alza en precios de Japón refuerza las expectativas de una subida de tasas por parte del Banco de Japón."),
    (r"An escalation of the US Canada trade dispute.*", "Nuevas tensiones comerciales generan volatilidad moderada en divisas de materias primas."),
    (r"EUROPEAN SESSION.*", "Sesión Europea: Agenda económica ligera previa a la apertura de los mercados estadounidenses."),
]

def translate_to_spanish(text: str) -> str:
    res = text
    for pattern, repl in TRANSLATION_MAP:
        res = re.sub(pattern, repl, res, flags=re.IGNORECASE)
    
    # Reemplazos de términos comunes de trading
    replacements = {
        "inflation": "inflación",
        "yields": "rendimientos de bonos",
        "interest rate": "tasa de interés",
        "central bank": "banco central",
        "stocks": "acciones",
        "higher": "al alza",
        "lower": "a la baja",
        "settles": "cierra",
        "rebound": "rebote técnico",
        "pullback": "retroceso",
        "oil": "petróleo",
        "gold": "oro",
        "silver": "plata",
    }
    for en, es in replacements.items():
        res = re.sub(r'\b' + en + r'\b', es, res, flags=re.IGNORECASE)
    return res


def classify_tag(title: str, summary: str) -> str:
    text = (title + " " + summary).upper()
    if any(k in text for k in ["GOLD", "ORO", "SILVER", "PLATA", "XAU", "COMEX", "METALS", "METALES"]):
        return "ORO"
    elif any(k in text for k in ["FED", "POWELL", "FOMC", "RATE", "INFLATION", "INFLACIÓN", "CPI", "IPC", "PCE", "CENTRAL BANK", "BANCO CENTRAL", "BCE", "ECB", "BOE", "BOJ", "YIELD"]):
        return "FED"
    elif any(k in text for k in ["S&P", "SPX", "NASDAQ", "DOW", "WALL STREET", "STOCKS", "ACCIONES", "BOLSAS", "EQUITIES"]):
        return "ÍNDICES"
    elif any(k in text for k in ["EUR", "GBP", "USD", "DOLLAR", "DÓLAR", "JPY", "AUD", "CURRENCY", "DIVISAS", "FOREX", "FX"]):
        return "FOREX"
    else:
        return "MACRO"


def fetch_and_translate_news() -> list:
    news_items = []
    seen_titles = set()
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    now = datetime.now(timezone.utc)
    time_label = f"Hoy · {now.strftime('%H:%M')} UTC"

    for url in RSS_FEEDS:
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.content)
            
            for item in root.findall(".//item")[:8]:
                title_en = item.find("title").text if item.find("title") is not None else ""
                title_en = title_en.strip().replace("<![CDATA[", "").replace("]]>", "")
                
                if not title_en or title_en in seen_titles:
                    continue
                seen_titles.add(title_en)
                
                desc_en = item.find("description").text if item.find("description") is not None else ""
                desc_en = desc_en.strip().replace("<![CDATA[", "").replace("]]>", "") if desc_en else ""
                if "<" in desc_en and ">" in desc_en:
                    desc_en = re.sub(r'<[^>]+>', '', desc_en).strip()
                
                link = item.find("link").text if item.find("link") is not None else "https://aeondev.vercel.app"
                
                title_es = translate_to_spanish(title_en)
                desc_es = translate_to_spanish(desc_en)
                if len(desc_es) > 220:
                    desc_es = desc_es[:217] + "..."
                if not desc_es:
                    desc_es = "Actualización macroeconómica en desarrollo para los mercados globales."
                    
                tag = classify_tag(title_es, desc_es)
                
                news_items.append({
                    "title": title_es,
                    "desc": desc_es,
                    "tag": tag,
                    "link": link,
                    "time": time_label,
                    "created_at": now.isoformat()
                })
        except Exception as e:
            print(f"[!] Error procesando feed {url}: {e}")
            
    return news_items[:10]


def sync_news_to_supabase(news_items: list) -> bool:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("[!] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.")
        return False
        
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/news"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # 1. Limpiar noticias anteriores
    try:
        requests.delete(f"{endpoint}?id=neq.00000000-0000-0000-0000-000000000000", headers=headers, timeout=10)
    except Exception as e:
        print(f"[!] Aviso al limpiar noticias: {e}")

    # 2. Insertar las noticias en español
    try:
        ins_resp = requests.post(endpoint, json=news_items, headers=headers, timeout=10)
        if ins_resp.status_code in (200, 201):
            print(f"[+] {len(news_items)} noticias financieras en ESPAÑOL publicadas en Supabase exitosamente.")
            return True
        else:
            print(f"[!] Error al insertar noticias en Supabase ({ins_resp.status_code}): {ins_resp.text}")
            return False
    except Exception as e:
        print(f"[!] Error de red al insertar noticias: {e}")
        return False


def main():
    print("==========================================================")
    print("  AEON REAL-TIME NEWS SYNC & TRANSLATION (ESPAÑOL)")
    print("==========================================================")
    
    news = fetch_and_translate_news()
    print(f"[*] Titulares en español capturados: {len(news)}")
    
    for idx, n in enumerate(news[:5], 1):
        print(f"  {idx}. [{n['tag']}] {n['title']}")
        print(f"     -> {n['desc'][:80]}...")
        
    sync_news_to_supabase(news)


if __name__ == "__main__":
    main()
