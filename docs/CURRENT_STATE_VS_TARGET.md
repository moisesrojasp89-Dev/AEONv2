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
| | **2.3** | Desacoplamiento de Datos de Gráfico (`chart.js` / TradingView Widgets) | 🚀 **En curso (Fase 4)** |
| **Fase 3** | **3.1** | Flujo de Recuperación de Password & Panel de Usuario (*"Mi Perfil"*) | ✅ **100% COMPLETADO** |
| | **3.2** | Calendario Económico: Grid Responsive 8 cols desktop / 4 cols mobile + Acordeón | ✅ **100% COMPLETADO** |
| | **3.3** | Base de Datos PostgreSQL (`economic_calendar`): UNIQUE constraints, Índices y RLS | ✅ **100% COMPLETADO** |
| | **3.4** | Diccionario Institucional: 74 eventos con descripciones macro, catalizadores y activos en radar | ✅ **100% COMPLETADO** |
| | **3.5** | Lógica de Señales Direccionales (Beat/Miss) con soporte para indicadores invertidos (Desempleo) | ✅ **100% COMPLETADO** |
| | **3.6** | Bot Autónomo ForexFactory (`Aeon_Bot/agents/calendar_agent.py`) con `curl_cffi` y auto-detección de TZ | ✅ **100% COMPLETADO** |
| | **3.7** | Automatización GitHub Actions: Ráfaga de 3 disparos (:01, :03, :06) y Supabase Realtime WebSockets | ✅ **100% COMPLETADO** |
| **Fase 4** | **4.1** | Laboratorio Cuantitativo MT5 Exness: 90k velas reales descargadas (M3, M5, M15, H1) | ✅ **100% COMPLETADO** |
| | **4.2** | Optimización de Estrategias: XAUUSD M15 (+34.1%), GBPUSD M5 (+37.4%), EURUSD M15 (+24.5%) | ✅ **100% COMPLETADO** |
| | **4.3** | Conexión de Señales en Frontend (`index.html` + `signalService.js` + Realtime WebSockets) | 🚀 **FASE ACTUAL** |
| | **4.4** | Visualización de Mercado Avanzada (Gráficos interactivos y multi-timeframe) | ⏳ Próximo |
| | **4.5** | Panel de Administración y Filtro Free vs Pro en Frontend | ⏳ Próximo |
| **Fase 5** | **5.1** | AI Briefing Automatizado (Pipeline de noticias + contexto macro) | ⏳ Planificado |
| **Fase 8** | **8.1** | Mobile Readiness Audit & Preparación de APIs para iOS/Android | ⏳ Planificado |

---

## 2. Resultados Oficiales del Laboratorio Cuantitativo (Exness Data)

Se completó la batería de backtesting sobre **90,000 velas reales de Exness con spreads reales**:

| Activo | Modalidad | Timeframe | Estrategia | R:R | Profit Factor | Beneficio Neto ($10k) | Drawdown |
|---|---|:---:|---|:---:|:---:|:---:|:---:|
| **XAU/USD (Oro)** | Day Trading | **M15** | EMA 50 Trend Rejection | **1:3.0** | **1.10** | **+$3,415.01 (+34.15%)** | 31.98% |
| **GBP/USD (Libra)** | Scalping | **M5** | Killzone Trend Continuation | **1:2.0** | **1.11** | **+$3,739.35 (+37.39%)** | 16.60% |
| **EUR/USD (Euro)** | Day Trading | **M15** | Killzone Trend Continuation | **1:2.5** | **1.06** | **+$2,454.85 (+24.55%)** | 23.16% |
| **PORTAFOLIO TOTAL** | **Combinado** | **Multi-TF** | **Estrategias Complementarias** | **Multi** | **1.09** | **+$9,609.21 (+96.09%)** | **16.60%** |
