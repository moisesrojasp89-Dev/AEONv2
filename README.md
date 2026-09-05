# AEON | Terminal de Inteligencia Macroeconómica, Mercados y Señales Cuantitativas

AEON es una plataforma profesional de inteligencia macroeconómica, análisis de mercados en tiempo real y señales cuantitativas diseñada para traders institucionales e inversores. Construida con una arquitectura de alto rendimiento (Frontend SPA en Vanilla JS / Vite, backend server-side en Supabase PostgreSQL con RLS/RPC y un motor cuantitativo y de inteligencia 24/7 en Python con conector para OANDA v20, Binance y feeds en vivo).

---

## 🏛️ Arquitectura del Sistema (AEON Real Intelligence v2.0)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ MOTOR AUTÓNOMO DE ALTA FRECUENCIA (scripts/ai/aeon_autonomous_engine)  │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │ OANDA v20 (Lote 12 Activos│ ◄──────►│ Binance Public API (BTC)   │  │
│  │  - Feed de Precios Live   │         │  - Ticker en Tiempo Real   │  │
│  └─────────────┬─────────────┘         └─────────────┬──────────────┘  │
│                │                                     │                 │
│  ┌─────────────▼─────────────────────────────────────▼──────────────┐  │
│  │ CEREBRO CUÁNTICO & AGENTES AUTÓNOMOS                             │  │
│  │  1. Motor Cuántico (14 Activos simultáneos):                     │  │
│  │     - dPOC de Volumen, Session VWAP, S1/S2/R1/R2 deterministas   │  │
│  │     - Sesgo cuantitativo institucional (BULLISH/BEARISH/NEUTRAL) │  │
│  │     - Cálculo exacto DXY mediante fórmula oficial ICE            │  │
│  │  2. Calendario Sniper (sync_calendar_sniper): T-5m sondeo rápido │  │
│  │     - Auto-resolución de eventos pasados y captura de 'Actual'   │  │
│  │  3. Daily Briefing Dinámico (get_session_dynamic_catalysts):     │  │
│  │     - Grounding directo en DB de calendario (Cero mock data)     │  │
│  │     - Modo Weekend Wrap (Cierre Semanal / Cripto 24/7 en vivo)   │  │
│  │  4. Generador de Noticias con Grounding Obligatorio:             │  │
│  │     - 5 categorías vivas ancladas a datos reales verificados     │  │
│  └───────────────────────────────────────────────────▲──────────────┘  │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS / WebSockets
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL & EDGE FUNCTIONS (Nube)                            │
│  - Seguridad RLS Zero-Trust en todas las tablas                        │
│  - Agregación instantánea de Track Record vía RPC (0ms math lag)       │
│  - Realtime seguro con REPLICA IDENTITY FULL                           │
│  - Edge Function aeon-chat: Copiloto IA Macro con Zero-Trust auth,     │
│    validación server-side de Pro tier, freshness check (<8m) y schema  │
│  - Tablas: market_intelligence, daily_briefings, news, economic_cal... │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Transmisión en Tiempo Real & WebSockets
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL WEB (Vite SPA / Vanilla JS / ES Modules)                 │
│  - Producción en Vercel: https://aeondev.vercel.app                    │
│  - Entorno Local (Wi-Fi): http://192.168.1.8:5173                      │
│  - Navbar Global Centralizada: Single source of truth (#navbar-root)   │
│  - AEON Copilot (chatWidget.js): Botón flotante FAB global con soporte │
│    multiestado (Guest / Free Paywall / Pro), cuotas y anti-XSS         │
│  - Hero Institucional: Imagen de alta fidelidad hero-preview.webp      │
│  - Radar de Mercados Globales: 14 activos, carrusel táctil y badges    │
│  - Terminal de Análisis Estructural (/analisis.html):                   │
│      • 4 Reyes del Mercado (Oro XAU, Bitcoin BTC, Euro EUR, Nasdaq NAS)│
│      • Gráficos nativos Canvas Lightweight Charts v5 (Curva neón)      │
│      • Zonas de Alta Probabilidad (ZAP Oferta / ZAP Demanda) & EMA 50  │
│      • Piscinas de Liquidez ($$$ BSL/SSL) & Escenarios "Si / Entonces" │
│      • Cálculo cuántico Zero-DDL en cited_key_levels y Heartbeat 25s   │
│  - Calendario Modular (form-controls, sidebar-widget, calendar.css)    │
│  - Feed de Noticias: Grid adaptativo de noticias destacadas y filtro   │
│  - Cero Deuda Técnica: 0 inline styles, 0 !important, tokens CSS puros │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Comandos para Ejecutar el Stack Local

### 1. Iniciar el Servidor Web (Vite HMR)
```bash
npx vite --host 0.0.0.0 --port 5173
```
* **Acceso desde PC:** `http://localhost:5173`
* **Acceso desde Móvil (Misma red Wi-Fi):** `http://192.168.1.8:5173`

### 2. Iniciar el Motor Autónomo de Agentes
```bash
python scripts/ai/aeon_autonomous_engine.py
```
* Sincroniza los 14 activos cada 20s (Oro Spot, Bitcoin, S&P 500, Nasdaq, Forex).
* Extrae catalizadores y noticias directamente de la base de datos de calendario oficial.
* Detecta automáticamente las sesiones bursátiles (**Tokio**, **Londres**, **Nueva York** y **Weekend Wrap de fin de semana**).

---

## 📊 Estado de Ejecución del Roadmap

| Componente | Descripción | Estado |
|---|---|:---:|
| **Motor Autónomo VPS** | Ingesta batch OANDA + Binance, 0 TwelveData calls, Gemini 3.1 Flash-Lite y deduplicación MD5. | ✅ **Operativo** |
| **Cerebro Cuántico 14 Activos** | Microestructura dPOC, VWAP, sesgos deterministas y fórmula ICE DXY. | ✅ **Operativo** |
| **Terminal de Análisis (`/analisis.html`)** | Gráficos Canvas nativos, ZAPs dinámicas, piscinas BSL/SSL, Zero-DDL y Heartbeat 25s. | ✅ **Operativo en Vivo** |
| **AEON Copilot (Chatbot IA)** | Copiloto macro institucional, Edge Function `aeon-chat` Zero-Trust y widget multiestado. | ✅ **Operativo** |
| **Hero Institucional & Grids** | Imagen `hero-preview.webp` dark luxury y grid responsive anti-colapso en noticias. | ✅ **Desplegado** |
| **Conexión Mercados ↔ Análisis** | Enlace contextual directo `[ Analizar ZAP → ]` con soporte de parámetros URL (`?symbol=`). | ✅ **Desplegado** |
| **Navbar Centralizada Unificada** | Cero duplicación HTML; inyección única vía `<div id="navbar-root"></div>`. | ✅ **Desplegado** |
| **Erradicación de Deuda Técnica** | Cero estilos inline, cero `!important`, variables CSS 100% tokenizadas. | ✅ **Auditoría OK** |
| **Grounding de Noticias & Briefing** | Cero plantillas estáticas; datos económicos extraídos de BD oficial en tiempo real. | ✅ **Operativo** |
| **Modo Weekend Wrap** | Cierre semanal con datos digeridos (NFP/Desempleo) y horizontes escalonados para Asia. | ✅ **Operativo** |
| **Mercados Móvil** | Carrusel horizontal táctil `86vw` con cero scroll vertical. | ✅ **Desplegado** |
| **Producción Vercel** | Despliegues automatizados y continuos desde `moisesrojasp89-Dev/AEONv2`. | ✅ **Verde (🟢 Ready)** |

---

## 📚 Documentación Técnica Adicional

* 📖 **[Bitácora de Desarrollo y Errores](docs/AEON_CHANGELOG_BITACORA.md):** Registro histórico detallado de bugs resueltos, refactorizaciones y lecciones aprendidas.
* 🏛️ **[Estándares de Ingeniería](docs/ENGINEERING_STANDARDS.md):** Convenciones de código, seguridad RLS y gobernanza cuantitativa.
* 🗺️ **[Roadmap v2.0](docs/AEON_ROADMAP_V2.md):** Fases y arquitectura a largo plazo.

