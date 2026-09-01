# AEON — Master Roadmap v2.0 (Recalibrado Post-Auditoría)

**Documento:** `docs/AEON_ROADMAP_V2.md`  
**Estado:** Directriz Ejecutable de Desarrollo  
**Versión:** 2.1 (Fases 0 a 5 Verificadas y Completadas en Producción)  
**Fecha de Actualización:** 26 de Agosto de 2026  
**Documentos de Referencia:**  
- [`docs/ENGINEERING_STANDARDS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/ENGINEERING_STANDARDS.md)  
- [`docs/CURRENT_STATE_VS_TARGET.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/CURRENT_STATE_VS_TARGET.md)  
- [`docs/CONVENTIONS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/CONVENTIONS.md)  
- [`docs/archive/AEON_SECURITY_AUDIT.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/archive/AEON_SECURITY_AUDIT.md)  
- [`docs/archive/AEON_QUANT_AUDIT.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/archive/AEON_QUANT_AUDIT.md)  

---

## 1. Visión General y Estado Actual del Sistema

El Roadmap v2.0 rige la evolución de **AEON** como plataforma cuantitativa e institucional. Tras la ejecución de los primeros 5 bloques fundamentales, el sistema cuenta con seguridad Zero-Trust, cálculo determinista sin Look-Ahead Bias, orquestación 24/7 en VPS y un motor de inteligencia contextual viva.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ESTADO DE EJECUCIÓN (SEPTIEMBRE DE 2026)                                     │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ ✅ FASES 100% COMPLETADAS            │ 🎯 EN PROGRESO / PRÓXIMO SPRINT      │
│ • Fase 0: Security & RLS Hardening   │ • Fase 6B: Monetización Stripe,      │
│ • Fase 1: Data Provider Layer & RPC  │   Gestión de Suscripciones In-App   │
│ • Fase 2: Quant Validation Lab (WFO) ├──────────────────────────────────────┤
│ • Fase 3: VPS 24/7 & Unified Daemons │ ⏳ PLANIFICADO A FUTURO              │
│ • Fase 4: Market Intel & Scoring     │ • Fases 7-8: CME Futures Order Flow  │
│ • Fase 5: AI Platform & Live Engine  │ • Fase 9: Multi-Region High Availab. │
│ • Fase 6A: Terminal Análisis & ZAPs  │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 2. Mapa de Fases y Progreso

```text
FASE 0: Security & Pre-Production Hardening ──────► [✅ COMPLETADO]
  │
FASE 1: Architecture & Data Provider Layer  ──────► [✅ COMPLETADO]
  │
FASE 2: Quant Validation Lab (OOS & Fricción) ────► [✅ COMPLETADO]
  │
FASE 3: Production Quant Engine & VPS 24/7 ───────► [✅ COMPLETADO]
  │
FASE 4: AEON Market Intelligence & Scoring ───────► [✅ COMPLETADO]
  │
FASE 5: AI Platform & Contextual Intelligence ────► [✅ COMPLETADO - v2.0]
  │
FASE 6A: Terminal de Análisis & ZAPs Estructural ─► [✅ COMPLETADO]
  │
FASE 6B: AEON Pro Terminal & Monetización Stripe ─► [🎯 PRÓXIMO OBJETIVO]
  │
FASE 7 & 8: Futures Intelligence (CME Order Flow) ─► [⏳ PLANIFICADO]
  │
FASE 9: High Reliability & Global Scale ──────────► [⏳ PLANIFICADO]
```

---

## 3. Detalle de Fases Completadas (0 a 5)

### FASE 0: Security & Pre-Production Hardening (✅ Completado)
* **Auth & RLS:** Bypass de `tier` eliminado; trigger `protect_profile_tier` en `public.profiles`.
* **Sanitización:** `escapeHTML()` y `sanitizeUrl()` en todas las plantillas dinámicas.
* **Edge Functions:** Validación de `SUPABASE_SERVICE_ROLE_KEY` en `calendar-cleanup`.

### FASE 1: Universal Data Provider Layer (✅ Completado)
* **Enums Canónicos:** `SIGNAL_STATUS` (`pending`, `active`, `hit_tp1`, `closed_tp`, `closed_be`, `closed_sl`, `cancelled`).
* **RPC Track Record:** Agregación matemática en PostgreSQL (`get_track_record_summary`) con tiempo de respuesta $< 50\text{ms}$.
* **Abstracción DataProvider:** Desacoplamiento de OANDA con modelos inmutables y símbolos normalizados (`XAUUSD`, `EURUSD`, `SPX500`).

### FASE 2: Quant Validation Lab (✅ Completado)
* **Developing POC / VWAP:** Motor acumulativo barra a barra con Cero Look-Ahead Bias verificado en [`scripts/quant/dpoc_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/dpoc_engine.py).
* **Fricción Real:** Deducción estricta de comisión (\$7/lote Exness Raw), spreads dinámicos y slippage estocástico en [`scripts/quant/backtest_friction_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/backtest_friction_engine.py).
* **WFO & Monte Carlo:** Validación Out-of-Sample ($WFE \ge 65\%$) en [`scripts/quant/walk_forward_validator.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/walk_forward_validator.py).

### FASE 3: Production Quant Engine & VPS 24/7 (✅ Completado)
* **Daemon 24/7:** [`scripts/quant/trade_watcher_daemon.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/trade_watcher_daemon.py) con bucle asíncrono, persistencia atómica en `data/trade_watcher_state.json` y reconexión automática.
* **Stack Docker:** [`deploy/Dockerfile`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/deploy/Dockerfile) y [`deploy/docker-compose.yml`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/deploy/docker-compose.yml) listos para orquestación en VPS Linux.

### FASE 4: AEON Market Intelligence (✅ Completado)
* **Detector de Régimen:** ADX ($N=14$) + ATR + $\text{SMA}_{20/50}$ con Blackout de seguridad $\pm 15$ min ante noticias de alto impacto en [`scripts/quant/market_intelligence.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/market_intelligence.py).
* **Scoring Explicable:** Desglose de confluencias de 4 pilares (0–100).

### FASE 5: AI Platform & Contextual Intelligence v2.0 (✅ Completado)
* **Pipeline de Datos Vivos:** Grounding con cotizaciones reales de Yahoo Finance (`GC=F`, `DX-Y.NYB`, etc.) y eventos de ForexFactory.
* **Anti-Alucinaciones:** Inferencia con `temperature=0.1` y esquema JSON estricto.
* **Máquina de Estados de Sesión:** `getCurrentMarketSession()` con resolución UTC en tiempo real (`Pre-Londres`, `Londres Activa`, `Pre-NY`, `Wall Street Activa`, `Cierre NY`, `Asia-Pacífico`).
* **Terminal UI:** Tira compacta de catalizadores (`catalyst-strip-table`), hora local adaptativa y feed cuántico con Order Flow (VWAP, dPOC, Zonas de Liquidez).

---

## 4. Próxima Fase de Ejecución: FASE 6 (AEON Pro Terminal & Monetización In-App)

> **Objetivo:** Implementar la pasarela de pagos Stripe, webhooks de aprovisionamiento automático, control de acceso estricto por RLS en base de datos y desbloqueo de módulos PRO exclusivos dentro de la plataforma web (Chatbot IA Institucional, Señales Cuantitativas Pro, Terminal de Mercados y Order Flow). Cero dependencia de servicios externos de terceros: la web es el único portal integral.

| Sprint | Tarea / Hito | Estado | Archivos / Componentes |
|---|---|:---:|---|
| **6.1** | **Integración Stripe Checkout & Webhooks Idempotentes** | 🎯 Próximo | Supabase Edge Functions (`stripe-webhook`), Stripe SDK |
| **6.2** | **Aprovisionamiento de Suscripción (`public.subscriptions`)** | 🎯 Próximo | Esquema relacional, triggers y control de expiración |
| **6.3** | **Blindaje RLS de Módulos Pro (`signals_pro_data`, Macro AI)** | 🎯 Próximo | Políticas de seguridad Zero-Trust en PostgreSQL |
| **6.4** | **Chatbot IA Institucional In-App (Asistente Macro & Trading)** | 🎯 Próximo | Módulo interactivo de inteligencia macro en la web |
| **6.5** | **Terminal de Mercados & Order Flow Pro en la Web** | 🎯 Próximo | `src/js/chart.js`, terminal de liquidez multi-activo |
| **6.6** | **Portal de Gestión de Suscripción en el Perfil** | 🎯 Próximo | `src/js/perfil.js`, Stripe Customer Portal |

---

## 5. Fases Futuras (Roadmap v2.0)

* **FASES 7 & 8: Futures Intelligence (CME / NYMEX Order Flow):** Feeds L2/L3 centralizados, Delta real, Footprint charts y Depth of Market (DOM).
* **FASE 9: High Reliability & Global Scale:** Failover multi-región, observabilidad APM y resiliencia 99.99%.
