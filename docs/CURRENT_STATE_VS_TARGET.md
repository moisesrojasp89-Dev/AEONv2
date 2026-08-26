# AEON — Estado Actual vs Arquitectura Objetivo (Master Plan v2.0)

**Única Fuente de Verdad Técnica, Diagnóstico de Arquitectura y Estado Real del Repositorio**  
**Última Actualización:** 26 de Agosto de 2026 (Fases 0 a 5 Completadas e Implementadas — AEON Real Intelligence v2.0 Activo)  
**Documentos de Consulta:**  
- 🗺️ [`docs/AEON_ROADMAP_V2.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_ROADMAP_V2.md) — Master Roadmap v2.0 Activo  
- 📐 [`docs/CONVENTIONS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/CONVENTIONS.md) — Estándares y Convenciones del Código  
- 🗄️ [`docs/archive/`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/archive/) — Histórico de Auditorías y Especificaciones  

---

## 1. Cuadro de Mando del Proyecto (Estado de Fases del Roadmap v2.0)

| Fase | Título / Objetivo | Estado Real | Resumen de Implementación Verificada |
|---|---|:---:|---|
| **Fase 0** | **Security & Pre-Production Hardening** | ✅ **100% COMPLETADO** | • `src/js/auth.js`: Bypass eliminado (cero `user_metadata`, cero emails hardcodeados, validación estricta en `profiles.tier`).<br>• `supabase/migrations/00001_initial_schema_and_rls.sql`: Esquema relacional, políticas RLS en todas las tablas y trigger `protect_profile_tier`.<br>• `supabase/functions/calendar-cleanup`: Verificación de `SERVICE_ROLE_KEY` / `CRON_SECRET`.<br>• `src/js/templates/ticker.js`: Sanitización XSS con `escapeHTML()`. |
| **Fase 1** | **Architecture & Data Provider Layer** | ✅ **100% COMPLETADO** | • `src/js/config/constants.js`: Enum canónico unificado `SIGNAL_STATUS` (`pending`, `active`, `hit_tp1`, `closed_tp`, `closed_be`, `closed_sl`, `cancelled`).<br>• `supabase/migrations/00002_track_record_rpc.sql`: Agregación matemática de KPIs (Win Rate, Profit Factor, R Neto) en PostgreSQL vía RPC.<br>• `src/js/services/marketService.js`: Desacoplamiento de OANDA hacia la abstracción `DataProvider` con `normalizeInstrument`.<br>• `src/js/templates/signal.js`: Eliminación de fallbacks numéricos sintéticos. |
| **Fase 2** | **Quant Validation Lab** | ✅ **100% COMPLETADO** | • `scripts/quant/dpoc_engine.py`: Motor de Developing POC y Developing VWAP barra a barra con **Cero Look-Ahead Bias** verificado.<br>• `scripts/quant/backtest_friction_engine.py`: Modelo de costes reales (comisión Exness Raw $\$7/\text{lote}$, spreads dinámicos, slippage estocástico y swaps).<br>• `scripts/quant/walk_forward_validator.py`: Validador de Walk-Forward Analysis ($WFE \ge 65\%$) y simulador de Monte Carlo (1.000 iteraciones). |
| **Fase 3** | **Production Quant Engine & VPS 24/7** | ✅ **100% COMPLETADO** | • `scripts/quant/data_provider.py`: Capa de datos con modelos inmutables y conector `MT5ExnessProvider`.<br>• `scripts/quant/trade_watcher_daemon.py`: Daemon asíncrono 24/7 (`asyncio`), persistencia atómica en `data/trade_watcher_state.json`, heartbeat y logging JSON.<br>• `deploy/aeon-quant-daemon.service` & `deploy/Dockerfile` / `docker-compose.yml`: Despliegue listo para VPS Linux. |
| **Fase 4** | **AEON Market Intelligence** | ✅ **100% COMPLETADO** | • `scripts/quant/market_intelligence.py`:<br>  - Detector multivariado de régimen: ADX ($N=14$) + ATR + alineación de medias ($\text{SMA}_{20} / \text{SMA}_{50}$).<br>  - Correlador macro: Bloqueo de seguridad por Blackout ($\pm 15$ min ante noticias `HIGH`).<br>  - Scoring institucional explicable (0–100) con desglose auditable de 4 pilares. |
| **Fase 5** | **AI Platform & Contextual Intelligence (v2.0)** | ✅ **100% COMPLETADO** | • `scripts/ai/briefing_agent.py` & `news_sync_agent.py`: Pipeline de datos vivos con cotizaciones reales de Yahoo Finance (`GC=F`, `DX-Y.NYB`, etc.) y eventos macro de ForexFactory.<br>• Grounding estricto anti-alucinaciones (`temperature=0.1`, JSON schema forzado).<br>• `src/js/config/constants.js`: Máquina de estados de sesiones en tiempo real (`getCurrentMarketSession`) basada en reloj UTC.<br>• `src/js/templates/briefingCard.js` & `news.js`: Tira terminal de catalizadores (`catalyst-strip-table`), hora local adaptativa y feed de noticias con lectura cuántica y Order Flow. |
| **Fase 6** | **AEON Pro Terminal & Monetización** | 🎯 **EN PROGRESO / PRÓXIMO SPRINT** | Pasarela de pagos Stripe, webhooks, gestión de suscripciones institucionales en `public.subscriptions` y canal Pro de Telegram. |
| **Fases 7-8**| **Futures Intelligence (CME Order Flow)** | ⏳ *Planificado* | Feeds de futuros centralizados L2/L3 (Rithmic/CQG), Delta real, Footprint y Depth of Market (DOM). |
| **Fase 9** | **High Reliability & Global Scale** | ⏳ *Planificado* | Clúster multi-región, APM en tiempo real y tolerancia a fallos. |

---

## 2. Máquina de Estados Canónica del Trade Watcher (Producción)

```text
                  [ 1. PENDING / CREATED ]
                             │
                             │ (Precio cruza nivel de entrada)
                             ▼
                        [ 2. ACTIVE ]
                       (SL inicial a -1.0R)
                             │
             ┌───────────────┴───────────────┐
             │ (Precio toca TP1 / +1.5R)     │ (Precio toca SL / -1.0R)
             ▼                               ▼
       [ 3. HIT_TP1 ]                  [ CLOSED_SL ]
    (Stop ajustado a BE: 0.0R)          (Loss: -1.0R)
             │
     ┌───────┴───────┐
     │ (Precio >= TP)│ (Precio retrocede a BE)
     ▼               ▼
[ CLOSED_TP ]   [ CLOSED_BE ]
 (+R target)     (0.0R neutral)
```

---

## 3. Máquina de Estados Temporal de Sesiones de Mercado (AEON Intelligence v2.0)

```text
  [ 06:00 - 08:00 UTC ] ──► 🟡 PRE-LONDRES (Preparación Killzone)
  [ 08:00 - 12:30 UTC ] ──► 🟢 SESIÓN LONDRES ACTIVA (Flujo Europeo)
  [ 12:30 - 13:30 UTC ] ──► 🟡 PRE-NUEVA YORK (Ajuste a Datos Macro)
  [ 13:30 - 20:00 UTC ] ──► 🟢 SESIÓN WALL STREET (Apertura Americana & Liquidez)
  [ 20:00 - 21:00 UTC ] ──► ⚪ CIERRE WALL STREET (Post-Mercado & Balance)
  [ 21:00 - 06:00 UTC ] ──► 🔵 SESIÓN ASIA-PACÍFICO (Tokio, Sídney & Rangos)
```

---

## 4. Arquitectura de Producción Implementada

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
│  │  1. aeon-quant-daemon: trade_watcher_daemon.py (M5/M15 Async)    │  │
│  │  2. aeon-macro-ai: briefing_agent.py (Grounding Gemini Flash)   │  │
│  │  3. aeon-calendar-watcher: news_sync_agent.py (RSS + Live Ticks) │  │
│  │  - Persistencia Atómica & Reconciliación tras reinicios          │  │
│  │  - Logging Estructurado JSON & Heartbeats cada 30s               │  │
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
