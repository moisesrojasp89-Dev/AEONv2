# AEON | Terminal de Inteligencia Macroeconómica, Mercados y Señales Cuantitativas

AEON es una plataforma profesional de inteligencia macroeconómica, análisis de mercados en tiempo real y señales cuantitativas diseñada para traders institucionales e inversores. Construida con una arquitectura de alto rendimiento (Frontend SPA en Vanilla JS / Vite, backend server-side en Supabase PostgreSQL con RLS/RPC y un motor cuantitativo y de inteligencia 24/7 en Python con conector para MetaTrader 5 / Exness y feeds en vivo).

---

## 🏛️ Arquitectura del Sistema (AEON Real Intelligence v2.0)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ SERVIDOR DEDICADO VPS LINUX (Ubuntu 24.04 LTS / LD4 Londres)           │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │ MetaTrader 5 (Exness ECN) │ ◄──────►│ ZeroMQ / IPC Socket Server │  │
│  │  - Feed de Precios Live   │ (0.5ms) │  - Puerto Local 5555       │  │
│  └───────────────────────────┘         └─────────────▲──────────────┘  │
│                                                      │                 │
│  ┌───────────────────────────────────────────────────▼──────────────┐  │
│  │ AEON UNIFIED DAEMONS (docker-compose.yml)                        │  │
│  │  1. aeon-quant-daemon (trade_watcher_daemon.py / market_intel)   │  │
│  │     - Bucle asíncrono M5/M15 con persistencia atómica            │  │
│  │     - Detector de régimen (ADX N=14 + ATR + SMA) + Blackout      │  │
│  │  2. aeon-macro-ai (briefing_agent.py)                            │  │
│  │     - Inferencia contextual Gemini 2.5 Flash (temperature=0.1)   │  │
│  │     - Grounding con precios reales de Yahoo y ForexFactory       │  │
│  │  3. aeon-calendar-watcher (news_sync_agent.py)                   │  │
│  │     - Extracción RSS + Order Flow Insights + Zero Duplicados     │  │
│  └───────────────────────────────────────────────────▲──────────────┘  │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS / WebSockets
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL & EDGE FUNCTIONS                                   │
│  - Seguridad RLS Zero-Trust en todas las tablas                        │
│  - Agregación instantánea de Track Record vía RPC (0ms math lag)       │
│  - Realtime seguro con REPLICA IDENTITY FULL                           │
│  - Tablas: daily_briefings, news, economic_calendar, signals, profiles │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Feed Público & Niveles PRO
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL (Vite SPA / Vanilla JS / ES Modules)                     │
│  - 0ms White-Screen Cache en sessionStorage / localStorage             │
│  - Máquina de estados de sesión UTC en tiempo real                     │
│  - Tira terminal de catalizadores y lecturas de Order Flow             │
│  - Gráficos interactivos Lightweight Charts v5                         │
│  - Compilación verificada < 300ms y Cero Deuda Técnica                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Estado de Ejecución del Roadmap v2.0

| Fase | Descripción | Estado |
|---|---|:---:|
| **Fase 0** | **Security & Pre-Production Hardening:** Eliminación de bypass de tier, RLS en todas las tablas, sanitización XSS. | ✅ **Completado** |
| **Fase 1** | **Architecture & Data Layer:** Enum canónico `SIGNAL_STATUS`, RPC de Track Record, abstracción `DataProvider`. | ✅ **Completado** |
| **Fase 2** | **Quant Validation Lab:** Developing POC/VWAP con Cero Look-Ahead Bias, backtest con fricción real (\$7/lote), WFO ($WFE \ge 65\%$). | ✅ **Completado** |
| **Fase 3** | **Production Quant Engine & VPS 24/7:** Trade Watcher async 24/7, reconciliación atómica tras reinicios, Docker stack. | ✅ **Completado** |
| **Fase 4** | **AEON Market Intelligence:** Detector multivariado de régimen, Blackout $\pm 15$ min, scoring institucional explicable. | ✅ **Completado** |
| **Fase 5** | **AI Platform & Contextual Intelligence v2.0:** Pipeline de datos vivos (Yahoo + ForexFactory), reloj de sesiones UTC dinámico, terminal strip. | ✅ **Completado** |
| **Fase 6** | **AEON Pro Terminal & Monetización In-App:** Stripe Checkout, webhooks idempotentes, gestión de suscripción y desbloqueo de módulos Pro (Chatbot IA, Señales Pro, Terminal de Mercados). | 🎯 **Próximo Sprint** |
| **Fases 7-8** | **Futures Intelligence (CME Order Flow):** Feeds centralizados L2/L3, Delta real, Footprint y DOM. | ⏳ Planificado |
| **Fase 9** | **High Reliability & Global Scale:** Failover multi-región, APM y disponibilidad 99.99%. | ⏳ Planificado |

---

## 🔬 Suite Cuantitativa & Agentes de Inteligencia

| Script / Módulo | Descripción & Principios Técnicos |
|---|---|
| 📐 [`scripts/quant/dpoc_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/dpoc_engine.py) | **Developing POC & VWAP:** Motor acumulativo barra a barra con **Cero Look-Ahead Bias** certificado. |
| 💸 [`scripts/quant/backtest_friction_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/backtest_friction_engine.py) | **Simulador de Fricción Real:** Comisión Exness Raw (\$7.00/lote RT), spreads dinámicos y slippage estocástico. |
| 🎲 [`scripts/quant/walk_forward_validator.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/walk_forward_validator.py) | **Validador OOS & Monte Carlo:** Walk-Forward Analysis ($WFE \ge 65\%$) y 1.000 simulaciones de permutación. |
| 🧠 [`scripts/quant/market_intelligence.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/market_intelligence.py) | **Market Intelligence & Scoring 0–100:** Detector multivariado (ADX $N=14$ + ATR + $\text{SMA}_{20/50}$), Blackout macro ($\pm 15$ min) y scoring de 4 pilares. |
| 🤖 [`scripts/ai/briefing_agent.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/ai/briefing_agent.py) | **Daily Macro Briefing:** Inferencia con Gemini Flash (temperature=0.1) y Grounding en cotizaciones de Yahoo Finance y ForexFactory. |
| ⚡ [`scripts/ai/news_sync_agent.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/ai/news_sync_agent.py) | **Live News & Order Flow Stream:** Extracción RSS institucional, eliminación total de duplicados y métricas de Session VWAP / dPOC. |
| ⚙️ [`scripts/quant/trade_watcher_daemon.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/trade_watcher_daemon.py) | **Trade Watcher 24/7:** Ejecutor asíncrono con máquina de estados canónica (`ACTIVE` ➔ `HIT_TP1` ➔ `CLOSED_TP/BE/SL`). |

---

## 🛠️ Guía de Inicio Rápido

### 1. Iniciar el Frontend Web
```bash
# 1. Instalar dependencias de Node
npm install

# 2. Iniciar servidor de desarrollo con Vite
npm run dev

# 3. Compilar para producción (Build verificado < 300ms)
npm run build
```

### 2. Ejecutar los Daemons en Local o Servidor
```bash
# Sincronizar noticias y lecturas de Order Flow en tiempo real
python scripts/ai/news_sync_agent.py

# Generar y publicar el Daily Macro Briefing con ciclo de vida de catalizadores
python scripts/ai/briefing_agent.py

# Ejecutar el Trade Watcher de señales
python scripts/quant/trade_watcher_daemon.py
```

---

## 📚 Documentación Técnica de Consulta

- 🗺️ [`docs/AEON_ROADMAP_V2.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_ROADMAP_V2.md) — Master Roadmap v2.0
- 🛡️ [`docs/ENGINEERING_STANDARDS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/ENGINEERING_STANDARDS.md) — Estándares de Ingeniería Profesional e Infraestructura
- 📐 [`docs/CONVENTIONS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/CONVENTIONS.md) — Estándares y Gobernanza de Código
- 📋 [`docs/CURRENT_STATE_VS_TARGET.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/CURRENT_STATE_VS_TARGET.md) — Diagnóstico y Arquitectura Objetivo
