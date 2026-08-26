"""
scripts/ai/news_sync_agent.py
==============================================================================
AEON Real-Time News Synchronizer
Extrae titulares financieros en vivo de ForexLive y WSJ Markets,
los categoriza institucionalmente (ORO, FOREX, ÍNDICES, FED)
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

def classify_tag(title: str, summary: str) -> str:
    text = (title + " " + summary).upper()
    
    if any(k in text for k in ["GOLD", "ORO", "SILVER", "PLATA", "XAU", "COMEX", "METALS"]):
        return "ORO"
    elif any(k in text for k in ["FED", "POWELL", "FOMC", "RATE", "INFLATION", "CPI", "PCE", "CENTRAL BANK", "BCE", "ECB", "BOE", "YIELD"]):
        return "FED"
    elif any(k in text for k in ["S&P", "SPX", "NASDAQ", "DOW", "WALL STREET", "STOCKS", "EQUITIES", "EARNINGS"]):
        return "ÍNDICES"
    elif any(k in text for k in ["EUR", "GBP", "USD", "DOLLAR", "DÓLAR", "JPY", "AUD", "CURRENCY", "FOREX", "FX"]):
        return "FOREX"
    else:
        return "MACRO"


def fetch_live_financial_news() -> list:
    news_items = []
    seen_titles = set()
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    now = datetime.now(timezone.utc)
    time_label = f"Hoy · {now.strftime('%H:%M')} UTC"

    for url in RSS_FEEDS:
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                continue
            root = ET.fromstring(resp.content)
            
            for item in root.findall(".//item")[:8]:
                title = item.find("title").text if item.find("title") is not None else ""
                title = title.strip().replace("<![CDATA[", "").replace("]]>", "")
                
                if not title or title in seen_titles:
                    continue
                seen_titles.add(title)
                
                desc = item.find("description").text if item.find("description") is not None else ""
                desc = desc.strip().replace("<![CDATA[", "").replace("]]>", "") if desc else ""
                if "<" in desc and ">" in desc:
                    desc = re.sub(r'<[^>]+>', '', desc).strip()
                
                if len(desc) > 180:
                    desc = desc[:177] + "..."
                if not desc:
                    desc = "Actualización macroeconómica en desarrollo para los mercados globales."
                    
                link = item.find("link").text if item.find("link") is not None else "#"
                tag = classify_tag(title, desc)
                
                news_items.append({
                    "title": title,
                    "desc": desc,
                    "tag": tag,
                    "link": link,
                    "time": time_label,
                    "created_at": now.isoformat()
                })
        except Exception as e:
            print(f"[!] Error leyendo feed {url}: {e}")
            
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
    
    # 1. Limpiar noticias anteriores demo
    try:
        del_resp = requests.delete(f"{endpoint}?id=neq.00000000-0000-0000-0000-000000000000", headers=headers, timeout=10)
        print(f"[*] Limpieza de noticias previas demo: status {del_resp.status_code}")
    except Exception as e:
        print(f"[!] Aviso al limpiar noticias: {e}")

    # 2. Insertar las noticias reales
    try:
        ins_resp = requests.post(endpoint, json=news_items, headers=headers, timeout=10)
        if ins_resp.status_code in (200, 201):
            print(f"[+] {len(news_items)} noticias financieras reales publicadas en Supabase exitosamente.")
            return True
        else:
            print(f"[!] Error al insertar noticias en Supabase ({ins_resp.status_code}): {ins_resp.text}")
            return False
    except Exception as e:
        print(f"[!] Error de red al insertar noticias: {e}")
        return False


def main():
    print("==========================================================")
    print("  AEON REAL-TIME NEWS SYNC AGENT")
    print("==========================================================")
    
    news = fetch_live_financial_news()
    print(f"[*] Titulares financieros en vivo capturados: {len(news)}")
    
    for idx, n in enumerate(news[:5], 1):
        print(f"  {idx}. [{n['tag']}] {n['title']}")
        
    success = sync_news_to_supabase(news)
    if success:
        print("\n[OK] Sincronización de noticias completada con éxito.")


if __name__ == "__main__":
    main()
