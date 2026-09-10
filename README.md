# AEON | Terminal de Inteligencia Macroeconómica, Mercados y Señales Cuantitativas

AEON es una plataforma profesional de inteligencia macroeconómica, análisis de mercados en tiempo real y señales cuantitativas diseñada para traders institucionales e inversores. Construida con una arquitectura de alto rendimiento (Frontend SPA en Vanilla JS / Vite, backend server-side en Supabase PostgreSQL con RLS/RPC y un motor cuantitativo y de inteligencia 24/7 en Python con conector para OANDA v20, Binance, Coinbase, St. Louis Fed FRED y Yahoo Finance).

---

## 🏛️ Arquitectura del Sistema (AEON Real Intelligence v2.0)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ MOTOR AUTÓNOMO DE ALTA FRECUENCIA (scripts/ai/aeon_autonomous_engine)  │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │ OANDA v20 (Lote 14 Activos│ ◄──────►│ Cripto APIs Públicas       │  │
│  │  - Metales, Energía, Forex│         │  - Binance (BTC)           │  │
│  │  - Índices Globales       │         │  - Coinbase (ETH)          │  │
│  └─────────────┬─────────────┘         └─────────────┬──────────────┘  │
│                │                                     │                 │
│  ┌─────────────▼─────────────────────────────────────▼──────────────┐  │
│  │ CEREBRO CUÁNTICO & AGENTES AUTÓNOMOS (17 Activos Globales)       │  │
│  │  1. Motor Cuántico Multi-Activo (17 Activos simultáneos):        │  │
│  │     - dPOC de Volumen, Session VWAP, S1/S2/R1/R2 deterministas   │  │
│  │     - Sesgo cuantitativo institucional (BULLISH/BEARISH/NEUTRAL) │  │
│  │     - Cálculo exacto DXY mediante fórmula oficial ICE            │  │
│  │     - Ingesta de Plata Spot (XAG), Petróleo WTI, Bitcoin y ETH   │  │
│  │  2. Sincronizador de Macro Liquidez Fed (5 Joyitas Institucionales):│
│  │     - Rendimiento Bonos 10A (US10Y) y 2A (US02Y) vía Yahoo/FRED  │
│  │     - Tasa Fondos Federales (FEDFUNDS), Reverse Repo (RRPONTSYD) │
│  │     - Balance Total de la Fed (WALCL) con alertas de QE/QT       │
│  │  3. Calendario Sniper (sync_calendar_sniper): T-5m sondeo rápido │  │
│  │     - Auto-resolución de eventos pasados y captura de 'Actual'   │  │
│  │  4. Daily Briefing Dinámico (get_session_dynamic_catalysts):     │  │
│  │     - Grounding directo en DB de calendario (Cero mock data)     │  │
│  │     - Modo Weekend Wrap (Cierre Semanal / Cripto 24/7 en vivo)   │  │
│  │  5. Generador de Noticias con Grounding Obligatorio:             │  │
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
│  - Stored Procedure atómico refund_ai_quota para cuotas IA             │
│  - Tabla macro_liquidity con triggers atómicos de auditoría y cambio   │
│  - Edge Function aeon-chat: Copiloto IA Macro con Zero-Trust auth,     │
│    validación server-side de Pro tier, freshness check (<8m) y schema  │
│  - Tablas: market_intelligence, macro_liquidity, daily_briefings, news │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Transmisión en Tiempo Real & WebSockets
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL WEB (Vite SPA / Vanilla JS / ES Modules)                 │
│  - Producción en Vercel: https://aeondev.vercel.app                    │
│  - Entorno Local (Wi-Fi): http://192.168.0.105:5173                    │
│  - Navbar Global Centralizada: Single source of truth (#navbar-root)   │
│    con navegación reactiva limpia ('Perfil' y cajón móvil 'CUENTA')    │
│  - Macro Liquidity HUD (index.html & mercados.html): Micro-panel neón  │
│    con los 5 barómetros de liquidez Fed y modal formativo educativo   │
│  - Radar de Mercados Globales (17 Activos): Carrusel táctil con swipe  │
│    horizontal, scroll vertical libre en móvil y actualización atómica  │
│    in-place con pulso cian (cero reseteos de scroll al recibir ticks)  │
│  - Acciones Contextuales de Mercado:                                   │
│      • [ Analizar ZAP → ] para los 4 reyes hacia /analisis.html        │
│      • [ Auditar con IA ✦ ] para 13 activos enlazado al Copilot IA    │
│  - Terminal de Análisis Estructural (/analisis.html):                   │
│      • 4 Reyes del Mercado (Oro XAU, Bitcoin BTC, Euro EUR, Nasdaq NAS)│
│      • Gráficos nativos Canvas Lightweight Charts v5 (Curva neón)      │
│      • Zonas de Alta Probabilidad (ZAP Oferta / ZAP Demanda) & EMA 50  │
│      • Piscinas de Liquidez ($$$ BSL/SSL) & Escenarios "Si / Entonces" │
│      • Cálculo cuántico Zero-DDL en cited_key_levels y Heartbeat 25s   │
│  - Playbooks Operativos: 5 manuales tácticos en carrusel horizontal    │
│    con botones de desplazamiento suave (← / →) y soporte responsive   │
│  - Command Center del Trader (/perfil.html): Rediseño Dark Luxury con  │
│    pestañas WAI-ARIA y modal contractual de Términos y Condiciones PRO │
│  - Pasarela Cripto Binance Pay: Checkout 3 pasos con blindaje legal    │
│    clickwrap obligatorio, QR en alta definición y Pay ID 401032901    │
│  - Panel de Pagos Admin (/admin-pagos.html): Interfaz móvil para       │
│    aprobar/rechazar órdenes y activar PRO en 1 toque vía RPC segura   │
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
* **Acceso desde Móvil (Misma red Wi-Fi):** `http://192.168.0.105:5173`

### 2. Iniciar el Motor Autónomo de Agentes
```bash
python scripts/ai/aeon_autonomous_engine.py
```
* Sincroniza los **17 activos** cada 20s (Oro Spot, Plata Spot, Petróleo WTI, Bitcoin, Ethereum, Índices y Forex).
* Sincroniza la **Macro Liquidez Fed** (US10Y, US02Y, FEDFUNDS, RRPONTSYD, WALCL) en cadencia multi-nivel.
* Extrae catalizadores y noticias directamente de la base de datos de calendario oficial.
* Detecta automáticamente las sesiones bursátiles (**Tokio**, **Londres**, **Nueva York** y **Weekend Wrap de fin de semana**).

---

## 📊 Estado de Ejecución del Roadmap

| Componente | Descripción | Estado |
|---|---|:---:|
| **Motor Autónomo VPS (17 Activos)** | Ingesta batch OANDA + Binance/Coinbase, 0 TwelveData calls, Gemini 3.1 Flash-Lite y deduplicación MD5. | ✅ **Operativo** |
| **Macro Liquidity & Fed Yields HUD** | Radar de liquidez Fed (US10Y, US02Y, FEDFUNDS, RRP, WALCL) con modal educativo y sync multi-cadencia. | ✅ **Operativo en Vivo** |
| **Cerebro Cuántico 17 Activos** | Microestructura dPOC, VWAP, sesgos deterministas y fórmula ICE DXY (Oro, Plata, WTI, Cripto, Índices, FX). | ✅ **Operativo** |
| **Terminal de Análisis (`/analisis.html`)** | Gráficos Canvas nativos, ZAPs dinámicas, piscinas BSL/SSL, Zero-DDL y Heartbeat 25s. | ✅ **Operativo en Vivo** |
| **AEON Copilot (Chatbot IA)** | Copiloto macro institucional, Edge Function `aeon-chat` Zero-Trust, cuotas atómicas y widget multiestado. | ✅ **Operativo** |
| **Hero Institucional Limpio** | Ilustración 3D cuántica despejada con micro-HUD superior minimalista. | ✅ **Desplegado** |
| **Radar de Mercados & Conexión Dual** | Enlace `[ Analizar ZAP → ]` para los 4 reyes y `[ Auditar con IA ✦ ]` conectado a Copilot para 13 activos. | ✅ **Desplegado** |
| **Paridad y Scroll In-Place en Mercados** | Desplazamiento vertical libre en móvil, swipe horizontal y actualización atómica in-place sin reseteo de carrusel. | ✅ **Desplegado** |
| **Playbooks Operativos en Carrusel** | 5 protocolos tácticos en carrusel horizontal continuo con botones tácticos de desplazamiento suave (`←` / `→`). | ✅ **Desplegado** |
| **Command Center del Trader (`perfil.html`)** | Interfaz Dark Luxury, navegación WAI-ARIA y modal contractual de Términos y Condiciones PRO. | ✅ **Desplegado** |
| **Navbar Centralizada Unificada** | Cero duplicación HTML (11 páginas); inyección única `<div id="navbar-root"></div>`. | ✅ **Desplegado** |
| **Erradicación de Deuda Técnica** | Cero estilos inline, cero `!important`, variables CSS 100% tokenizadas. | ✅ **Auditoría OK** |
| **Grounding de Noticias & Briefing** | Cero plantillas estáticas; datos económicos extraídos de BD oficial en tiempo real. | ✅ **Operativo** |
| **Modo Weekend Wrap** | Cierre semanal con datos digeridos (NFP/Desempleo) y horizontes escalonados para Asia. | ✅ **Operativo** |
| **Pasarela Binance Pay & Panel Admin** | Modal 3 pasos con clickwrap legal, QR Pay ID 401032901, RPC atómico y admin panel web móvil. | ✅ **Desplegado** |
| **Producción Vercel** | Despliegues automatizados y continuos desde `moisesrojasp89-Dev/AEONv2`. | ✅ **Verde (🟢 Ready)** |

---

## 📚 Documentación Técnica Adicional

* 📖 **[Bitácora de Desarrollo y Errores](docs/AEON_CHANGELOG_BITACORA.md):** Registro histórico detallado de bugs resueltos, refactorizaciones y lecciones aprendidas.
* 🏛️ **[Estándares de Ingeniería](docs/ENGINEERING_STANDARDS.md):** Convenciones de código, seguridad RLS y gobernanza cuantitativa.
* 🗺️ **[Roadmap v2.0](docs/AEON_ROADMAP_V2.md):** Fases y arquitectura a largo plazo.
* 📐 **[Convenciones Técnicas](docs/CONVENTIONS.md):** Estándares de diseño, BEM, tokens y protocolos de señales.
* 📋 **[Estado Actual vs Objetivo](docs/CURRENT_STATE_VS_TARGET.md):** Diagnóstico de arquitectura y cuadro de mando exhaustivo.

