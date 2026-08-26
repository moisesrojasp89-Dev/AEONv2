# AEON — Estado Actual vs Arquitectura Objetivo (Master Plan v2.0)

**Única Fuente de Verdad Técnica, Diagnóstico de Arquitectura y Estado Real del Repositorio**  
**Última Actualización:** 25 de Agosto de 2026 (Fases 0 a 4 Completadas e Implementadas)  
**Documentos de Consulta:**  
- 🗺️ [`docs/AEON_ROADMAP_V2.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_ROADMAP_V2.md) — Master Roadmap v2.0 Activo  
- 📐 [`docs/CONVENTIONS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/CONVENTIONS.md) — Estándares y Convenciones del Código  
- 🗄️ [`docs/archive/`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/archive/) — Histórico de Auditorías (Seguridad, Técnica, Cuantitativa) y Especificaciones  

---

## 1. Cuadro de Mando del Proyecto (Estado de Fases del Roadmap v2.0)

| Fase | Título / Objetivo | Estado Real | Resumen de Implementación Verificada |
|---|---|:---:|---|
| **Fase 0** | **Security & Pre-Production Hardening** | ✅ **100% COMPLETADO** | • `src/js/auth.js`: Bypass eliminado (cero `user_metadata`, cero emails hardcodeados, validación estricta en `profiles.tier`).<br>• `supabase/migrations/00001_initial_schema_and_rls.sql`: Esquema relacional, políticas RLS en todas las tablas y trigger `protect_profile_tier`.<br>• `supabase/functions/calendar-cleanup`: Verificación de `SERVICE_ROLE_KEY` / `CRON_SECRET`.<br>• `src/js/templates/ticker.js`: Sanitización XSS con `escapeHTML()`. |
| **Fase 1** | **Architecture & Data Provider Layer** | ✅ **100% COMPLETADO** | • `src/js/config/constants.js`: Enum canónico unificado `SIGNAL_STATUS` (`pending`, `active`, `hit_tp1`, `closed_tp`, `closed_be`, `closed_sl`, `cancelled`).<br>• `supabase/migrations/00002_track_record_rpc.sql`: Agregación matemática de KPIs (Win Rate, Profit Factor, R Neto) en PostgreSQL vía RPC.<br>• `src/js/services/marketService.js`: Desacoplamiento de OANDA hacia la abstracción `DataProvider` con `normalizeInstrument`.<br>• `src/js/templates/signal.js`: Eliminación de fallbacks numéricos sintéticos. |
| **Fase 2** | **Quant Validation Lab** | ✅ **100% COMPLETADO** | • `scripts/quant/dpoc_engine.py`: Motor de Developing POC y Developing VWAP barra a barra con **Cero Look-Ahead Bias** verificado.<br>• `scripts/quant/backtest_friction_engine.py`: Modelo de costes reales (comisión Exness Raw $\$7/\text{lote}$, spreads dinámicos, slippage estocástico y swaps).<br>• `scripts/quant/walk_forward_validator.py`: Validador de Walk-Forward Analysis ($WFE \ge 65\%$) y simulador de Monte Carlo (1.000 iteraciones). |
| **Fase 3** | **Production Quant Engine & VPS 24/7** | ✅ **100% COMPLETADO** | • `scripts/quant/data_provider.py`: Capa de datos con modelos inmutables y conector `MT5ExnessProvider`.<br>• `scripts/quant/trade_watcher_daemon.py`: Daemon asíncrono 24/7 (`asyncio`), persistencia atómica en `data/trade_watcher_state.json`, heartbeat y logging JSON.<br>• `deploy/aeon-quant-daemon.service` & `deploy/Dockerfile` / `docker-compose.yml`: Despliegue listo para VPS Linux. |
| **Fase 4** | **AEON Market Intelligence** | ✅ **100% COMPLETADO** | • `scripts/quant/market_intelligence.py`:<br>  - Detector multivariado de régimen: ADX ($N=14$) + ATR + alineación de medias ($\text{SMA}_{20} / \text{SMA}_{50}$).<br>  - Correlador macro: Bloqueo de seguridad por Blackout ($\pm 15$ min ante noticias `HIGH`).<br>  - Scoring institucional explicable (0–100) con desglose auditable de 4 pilares. |
| **Fase 5** | **AI Platform & Contextual Intelligence** | ⏳ *Próxima Fase* | Pipeline automatizado de Daily Briefing Macro y análisis contextual (sin alterar señales cuantitativas deterministas). |
| **Fase 6** | **AEON Pro Terminal & Monetización** | ⏳ *Planificado* | Pasarela de pagos Stripe, webhooks y gestión de suscripciones institucionales. |
| **Fases 7-8**| **Futures Intelligence (CME Order Flow)** | ⏳ *Planificado* | Feeds de futuros centralizados L2/L3 (Rithmic/CQG), Delta real, Footprint y DOM. |
| **Fase 9** | **High Reliability & Global Scale** | ⏳ *Planificado* | Clúster multi-región y alta disponibilidad. |

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

```javascript
// src/js/config/constants.js
export const SIGNAL_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  HIT_TP1: 'hit_tp1',
  CLOSED_TP: 'closed_tp',
  CLOSED_BE: 'closed_be',
  CLOSED_SL: 'closed_sl',
  WON: 'won',       // Alias de compatibilidad
  LOST: 'lost',     // Alias de compatibilidad
  CANCELLED: 'cancelled',
};
```

---

## 3. Arquitectura de Producción Implementada

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
│  │ AEON QUANT DAEMON (trade_watcher_daemon.py & market_intel)       │  │
│  │  - Bucle de evaluación asíncrono M5/M15 (Latencia < 100ms)       │  │
│  │  - Detector de Régimen Multivariado (ADX N=14 + ATR + SMA)       │  │
│  │  - Scoring Explicable 0-100 + Blackout Macro (+-15 min)          │  │
│  │  - Persistencia Atómica: data/trade_watcher_state.json           │  │
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
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Feed Público & Niveles PRO
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL (Vite SPA / ES Modules)                                  │
│  - 0ms White-Screen Cache en sessionStorage / localStorage             │
│  - Gráficos interactivos Lightweight Charts v5                         │
│  - Componentes accesibles y sanitizados contra XSS                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Estado de los Componentes del Sistema

```text
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ ✅ PRODUCCIÓN-READY (Fases 0 a 4)    │ ⏳ PRÓXIMOS PASOS (Fases 5 y 6)      │
│ - Zero-Trust Auth & RLS en Postgres  │ - Generación de Daily Briefing Macro │
│ - Migraciones SQL Versionadas        │ - Agente de Noticias & Sentimiento   │
│ - RPC Track Record en Base de Datos  │ - Pasarela de Pagos Stripe           │
│ - Abstracción DataProvider Universal │ - Gestión de Suscripciones Pro       │
│ - Developing POC / VWAP (Sin sesgos) │ - Canal Privado de Telegram PRO      │
│ - Modelado de Fricción Exness Raw    │                                      │
│ - Daemon 24/7 asíncrono en VPS       │                                      │
│ - Scoring Explicable 0-100 & Blackout│                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```
