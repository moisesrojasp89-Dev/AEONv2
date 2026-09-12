# AEON — Estado Actual vs Arquitectura Objetivo (Master Plan v2.0)

**Única Fuente de Verdad Técnica, Diagnóstico de Arquitectura y Estado Real del Repositorio**  
**Última Actualización:** Septiembre de 2026 (Fases 0 a 6I Completadas e Implementadas en Producción — AEON Active Copilot Harness Operativo)  
**Documentos de Consulta:**  
- 🗺️ [`docs/AEON_ROADMAP_V2.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_ROADMAP_V2.md) — Master Roadmap v2.0 Activo  
- 🛡️ [`docs/ENGINEERING_STANDARDS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/ENGINEERING_STANDARDS.md) — Estándares Oficiales de Ingeniería e Infraestructura  
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
| **Fase 5** | **AI Platform & Contextual Intelligence (v2.0)** | ✅ **100% COMPLETADO** | • `scripts/ai/aeon_autonomous_engine.py`: Motor unificado de alta frecuencia con cotizaciones en tiempo real (OANDA batch + Binance directo, 0 TwelveData reqs).<br>• Migración a `gemini-3.1-flash-lite` con latencia de 400-800ms y resolución definitiva de cuotas.<br>• Deduplicación algorítmica por hash MD5 de titulares y noticias multiactivo por sector.<br>• Modo `weekend_wrap` con balance de fin de semana (NFP, Desempleo, Salarios) y horizontes escalonados de inmediatez para apertura de Asia.<br>• Grounding directo en `public.economic_calendar` y `public.market_intelligence`. |
| **Fase 6A** | **Terminal de Análisis Estructural & Conexión en Vivo** | ✅ **100% COMPLETADO** | • `analisis.html` & `src/js/analysis.js`: Terminal de ejecución institucional para los 4 Reyes (Oro, BTC, Euro, Nasdaq).<br>• Motor gráfico Canvas nativo (Lightweight Charts v5) con curva neón fluida y niveles ZAP quirúrgicos (Venta, Compra, EMA 50).<br>• Arquitectura Zero-DDL: almacenamiento del payload cuantitativo (`structural_poi`, `session_levels`, `liquidity_pools`, `structural_scenarios`) en `cited_key_levels JSONB`.<br>• Normalización `BTCUSDT` <-> `BTCUSD` y Heartbeat Polling de seguridad cada 25s en cliente.<br>• Formateo numérico institucional de alta precisión para Forex (`EURUSD` a 4 decimales: `1.1614`).<br>• Interconexión fluida Mercados ↔ Análisis (`[ Analizar ZAP → ]`). |
| **Fase 6B** | **AEON Copilot (Chatbot IA Institucional)** | ✅ **100% COMPLETADO** | • `supabase/functions/aeon-chat` & `00006_ai_quota_refund_and_security_hardening.sql`: Edge Function con arquitectura Zero-Trust (`user_id` extraído exclusivamente del JWT en servidor).<br>• Control de acceso server-side por tier (`profiles.tier in ('pro', 'institutional', 'admin')`) antes de invocar IA.<br>• Cuotas atómicas con bloqueo de fila (`FOR UPDATE`) y Stored Procedure atómico de reembolso `refund_ai_quota` anti-race conditions.<br>• Freshness check (< 8 min) sobre precios de mercado, structured output forzado (`MACRO`, `TECNICO_ORDERFLOW`, `CATALIZADOR`, `GESTION_RIESGO`) y escudo anti-jailbreak `STANDARD_REFUSAL`.<br>• `src/js/components/chatWidget.js` & `chat.css`: Widget flotante multiestado (Guest / Free Paywall / Pro) integrado globalmente en `#navbar-root`, con cuotas de 50 consultas/día e historial local. |
| **Fase 6C** | **Command Center Trader & Contrato PRO** | ✅ **100% COMPLETADO** | • `perfil.html`, `src/js/perfil.js` & `perfil.css`: Rediseño completo bajo estética Dark Luxury / Linear.<br>• Pestañas accesibles por teclado WAI-ARIA (General, Membresía, Seguridad, Preferencias).<br>• Modal contractual de Términos y Condiciones formales para membresías PRO con descargo No-Financial-Advice vinculante.<br>• Optimización responsive móvil eliminando cards con bordes excesivos y padding rígido. |
| **Fase 6D** | **Playbooks Operativos & Paridad Móvil** | ✅ **100% COMPLETADO** | • Rebranding de "Educación" a "Playbooks Operativos" en toda la plataforma (`index.html`, `navbar.js`, `perfil.html`, legales).<br>• Limpieza visual de la imagen del hero (`index.html` & `hero.css`), eliminando micro-HUDs redundantes.<br>• Homogeneización de tarjetas de mercado: acción dual `[ Analizar ZAP → ]` (4 reyes) y `[ Auditar con IA ✦ ]` (10 activos adicionales) conectado a Copilot.<br>• Flexbox elástico con 100% de paridad dimensional al subpíxel (0.00px de variación) en móviles. |
| **Fase 6E** | **Pasarela Cripto Binance Pay & Panel Admin Móvil** | ✅ **100% COMPLETADO** | • Checkout modal en 3 pasos con clickwrap legal obligatorio (\$1.99, \$6.99, \$14.99 USDT).<br>• Integración de QR oficial y Pay ID `401032901` con validación estricta de TxID.<br>• `admin-pagos.html` & `admin-pagos.js`: Panel administrativo móvil protegido por RLS/role check con activación en 1 clic vía Stored Procedure `approve_crypto_payment`. |
| **Fase 6F** | **Macro Liquidez Fed HUD (5 Joyitas del Banco Central)** | ✅ **100% COMPLETADO** | • Monitor en vivo de US10Y, US02Y, FEDFUNDS, RRPONTSYD y WALCL.<br>• Sincronización multi-cadencia autónoma en Python vía Yahoo Finance y St. Louis Fed FRED.<br>• Tabla relacional `public.macro_liquidity` con RLS y trigger de auditoría idempotente `trg_log_macro_liquidity_change`.<br>• Componente visual `macroLiquidityHUD.js`, modal formativo interactivo y Playbook Operativo #5 en `education.json`. |
| **Fase 6G** | **Expansión a 17 Activos & Refactorización UX In-Place** | ✅ **100% COMPLETADO** | • Incorporación de Plata Spot (XAG), Petróleo WTI (USOIL) y Ethereum (ETH) con badges SVG vectoriales.<br>• `.education-grid` en carrusel horizontal con scroll-snap y controles tácticos de navegación (`←`/`→`) con scroll suave `±330px`.<br>• Desbloqueo de scroll vertical en `mercados.html` móvil para visualización completa de tarjetas sin perder swipe horizontal.<br>• Reemplazo atómico *in-place* de tarjetas actualizadas (`existingCard.replaceWith(newCard)`) con pulso cian (.card-live-pulse) y preservación de scroll en ticks realtime. |
| **Fase 6I** | **AEON Active Copilot Harness & Trading Sentinel** | ✅ **100% COMPLETADO** | • `scripts/quant/harness_sentinel.py`: Centinela cuántico 24/7 con confluencia $Price \in ZAP \land BSL/SSL \land dist\_dpoc > 0$, cooldown de 15m y worker thread no bloqueante (timeout 3.0s).<br>• Migración 00010: `trading_signal_events` (bus de eventos con TTL 2h & Realtime), `user_trade_journal` (bitácora con flag de consolidación) y RPC `check_overtrading_guardrail` (ventana móvil 45m con blindaje anti-IDOR).<br>• `supabase/functions/aeon-copilot-event`: Fan-out en <1.2s con Gemini 2.5 Flash-Lite, idempotencia y broadcast Realtime.<br>• `src/js/components/chatWidget.js`: Radar chime nativo WebAudio, toast flotante con snooze 15m, renderizado Markdown y embudo Freemium vs PRO verificado en producción con rechazo R/R 0.47:1. |
| **Fase 6H** | **Pasarela Stripe FIAT (Opcional Tarjetas)** | 🎯 **EN PROGRESO / PRÓXIMO SPRINT** | Pasarela opcional para cobros en divisa fiduciaria con tarjeta de crédito/débito y webhooks idempotentes. |
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
│  │ AEON UNIFIED DAEMONS (Local VPS / Docker)                        │  │
│  │  1. aeon_autonomous_engine: Ingesta 17 activos, Macro Fed HUD,   │  │
│  │     Calendario Sniper y Noticias Grounded                        │  │
│  │  2. harness_sentinel.py: Centinela Cuántico 24/7 (ZAP + BSL/SSL)  │  │
│  │     con thread no bloqueante (timeout 3.0s) & fan-out HTTP        │  │
│  │  3. trade_watcher_daemon.py: Seguimiento estocástico órdenes     │  │
│  │  - Persistencia atómica de estados y cooldowns en JSON           │  │
│  │  - Logging Estructurado JSON & Heartbeats cada 20s/30s           │  │
│  └───────────────────────────────────────────────────▲──────────────┘  │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS / WebSockets
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL & EDGE FUNCTIONS                                   │
│  - Seguridad RLS Zero-Trust en 100% de tablas                          │
│  - Active Copilot Harness & Event Bus (00010):                         │
│      • trading_signal_events (TTL 2h, Realtime broadcast)              │
│      • user_trade_journal & RPC check_overtrading_guardrail (anti-IDOR)│
│  - Edge Functions:                                                     │
│      • aeon-chat: Copiloto Macro Zero-Trust con cuota atómica (50/día) │
│      • aeon-copilot-event: Síntesis táctica Gemini 2.5 Flash-Lite      │
│        en <1.2s e idempotencia por event_id                            │
│  - Tablas: market_intelligence, macro_liquidity, daily_briefings, news │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Realtime Broadcast & WebSockets
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL (Vite SPA / Vanilla JS / ES Modules)                     │
│  - Active Copilot Harness: Radar chime WebAudio, toast neón y snooze   │
│  - Manejo Freemium vs PRO verificado en vivo con rechazo de bajo R/R   │
│  - Terminal de Análisis Estructural (/analisis.html) con gráficos LW v5│
│  - Radar de Mercados (17 Activos) con actualización atómica in-place   │
│  - Compilación verificada < 300ms y Cero Deuda Técnica                 │
└────────────────────────────────────────────────────────────────────────┘
```
