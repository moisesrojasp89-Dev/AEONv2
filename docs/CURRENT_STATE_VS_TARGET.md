# AEON — Estado Actual vs Arquitectura Objetivo (Master Plan v2.0)

> **Documento vivo de diagnóstico arquitectónico, auditoría técnica y mapa de ruta de modernización de AEON Terminal.**
> **Última actualización:** 25 de Agosto de 2026

---

## 1. Estado de Ejecución de Fases (Roadmap Maestro)

| Fase | Sprint | Descripción | Estado |
|---|---|---|:---:|
| **Fase 0** | **0.1** | Seguridad Crítica (.gitignore, rotación de secrets, aislamiento de `.env`) | ✅ **100% COMPLETADO** |
| | **0.2** | Limpieza de Raíz y Organización (`scripts/`, dependencias, build Vite) | ✅ **100% COMPLETADO** |
| | **0.3** | Design System & CSS Tokens (variables, `-webkit-backdrop-filter`, dark mode) | ✅ **100% COMPLETADO** |
| | **0.4** | Frontend Hardening XSS (`escapeHTML`, `sanitizeUrl`) & Edge Functions | ✅ **100% COMPLETADO** |
| **Fase 1** | **1.1** | Constantes Centralizadas, `CONVENTIONS.md` y Arquitectura Modular | ✅ **100% COMPLETADO** |
| | **1.2** | Servicios Desacoplados (`signalService`, `newsService`, `calendarService`) | ✅ **100% COMPLETADO** |
| | **1.3** | Accesibilidad ARIA, Validación de Password, Formularios y Autenticación | ✅ **100% COMPLETADO** |
| | **1.4** | Edge Function Proxy de TwelveData / OANDA multi-activo | ✅ **100% COMPLETADO** |
| **Fase 2** | **2.1** | Variación Porcentual Diaria Real de Activos OANDA (XAU, EUR, SPX, NAS, US30) | ✅ **100% COMPLETADO** |
| | **2.2** | Adaptador `marketService` & Sistema de Caché Instantáneo (0ms white-screen) | ✅ **100% COMPLETADO** |
| | **2.3** | Desacoplamiento de Datos de Gráfico (`chart.js` / TradingView Widgets) | ⏳ Planificado |
| **Fase 3** | **3.1** | Flujo de Recuperación de Password & Panel de Usuario (*"Mi Perfil"*) | ✅ **100% COMPLETADO** |
| | **3.2** | Calendario Económico: Grid Responsive 8 cols desktop / 4 cols mobile + Acordeón | ✅ **100% COMPLETADO** |
| | **3.3** | Base de Datos PostgreSQL (`economic_calendar`): UNIQUE constraints, Índices y RLS | ✅ **100% COMPLETADO** |
| | **3.4** | Diccionario Institucional: 74 eventos con descripciones macro, catalizadores y activos en radar | ✅ **100% COMPLETADO** |
| | **3.5** | Lógica de Señales Direccionales (Beat/Miss) con soporte para indicadores invertidos (Desempleo) | ✅ **100% COMPLETADO** |
| | **3.6** | Bot Autónomo ForexFactory (`Aeon_Bot/agents/calendar_agent.py`) con `curl_cffi` y auto-detección de TZ | ✅ **100% COMPLETADO** |
| | **3.7** | Automatización GitHub Actions: Ráfaga de 3 disparos (:01, :03, :06) y Supabase Realtime WebSockets | ✅ **100% COMPLETADO** |
| **Fase 4** | **4.1** | Laboratorio Cuantitativo MT5 Exness: 90k velas reales descargadas (M3, M5, M15, H1) | ✅ **100% COMPLETADO** |
| | **4.2** | Optimización de Estrategias: Volume Profile POC, Session VWAP, SMA 20 + RSI (+152.2% Portafolio Total) | ✅ **100% COMPLETADO** |
| | **4.3** | Motor Adaptativo (`Aeon_Bot`): Detector ADX $N=3$, Trade Watcher Lifecycle, Score (0-100) y RLS Server-Side | ✅ **100% COMPLETADO** |
| | **4.4** | Terminal de Señales Frontend: Glassmorphic Cards, Barra de KPIs, Filtros por Activo, Scroll Snap Móvil | ✅ **100% COMPLETADO** |
| | **4.5** | Módulo de Historial & Track Record Semanal en Frontend (`#senales-historial`) | 🚀 **EN CURSO** |
| | **4.6** | Visualización de Mercado Avanzada (Gráficos interactivos y multi-timeframe) | ⏳ Próximo |
| **Fase 5** | **5.1** | AI Briefing Automatizado (Pipeline de noticias + contexto macro) | ⏳ Planificado |
| **Fase 8** | **8.1** | Mobile Readiness Audit & Preparación de APIs para iOS/Android | ⏳ Planificado |

---

## 2. Resultados Oficiales del Laboratorio Cuantitativo Avanzado (Exness Data)

Se completó la batería de backtesting de Order Flow (Volume Profile POC), Session VWAP y SMA 20 sobre **90,000 velas reales de Exness**:

| Activo | Modalidad | Timeframe | Estrategia Validada | Ratio R:R | Profit Factor | Beneficio Neto ($10k) | Max Drawdown |
|---|---|:---:|---|:---:|:---:|:---:|:---:|
| **XAU/USD (Oro)** | Day Trading | **M15** | **Volume Profile POC Dynamic Bounce** | **1:3.0** | **1.11** | **+$5,791.04 (+57.91%)** | 37.26% |
| **EUR/USD (Euro)** | Day Trading | **M15** | **Session VWAP Pullback & Rejection** | **1:2.5** | **1.11** | **+$5,697.34 (+56.97%)** | 32.31% |
| **GBP/USD (Libra)** | Scalping | **M5** | **Killzone Trend Continuation / SMA 20** | **1:2.0** | **1.11** | **+$3,739.35 (+37.39%)** | **16.60%** |
| **PORTAFOLIO MASTER** | **Combinado** | **Multi-TF** | **Confluencias Institucionales** | **Multi** | **1.11** | **+$15,227.73 (+152.27%)** | **16.60%** |

---

## 3. Estado de la Arquitectura de Señales en Producción

```text
[ MT5 Exness / OANDA ] ──> [ regime_detector.py (ADX N=3) ] ──> [ adaptive_engine.py ]
                                                                       │
                                                                       ▼
                                                       [ delivery/supabase_client.py ]
                                                        ├── INSERT 'signals' (Público: Tesis, Chips, Score, Régimen)
                                                        └── INSERT 'signals_pro_data' (Privado PRO: Precios de Entrada, SL, TP)
                                                                       │
                                              ┌────────────────────────┴────────────────────────┐
                                              ▼ (WebSockets)                                    ▼
                                  [ AEON Frontend / signal.js ]                     [ scheduler/watcher.py ]
                                  • FREE: Tesis + Chips + Score + Blur UI           • ACTIVE -> HIT_TP1 (SL a BE)
                                  • PRO: Desbloqueo Numérico Exacto                 • HIT_TP1 -> CLOSED_TP / CLOSED_SL
```

### Cuentas de Prueba Configuradas en Desarrollo
* `malejandro.rp19@gmail.com`: **PRO** (Desbloqueo numérico total).
* `cmroyalglobal@gmail.com`: **FREE** (Bloqueado con blur para testear experiencia y conversión de usuarios gratuitos).
