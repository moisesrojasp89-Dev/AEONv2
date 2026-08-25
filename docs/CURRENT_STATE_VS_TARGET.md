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
| **Fase 4** | **4.1** | Motor de Señales Cuantitativas (Silver Bullet / Oro / Forex) y conexión con Supabase (`signals` / `signals_pro_data`) | 🚀 **FASE ACTUAL** |
| | **4.2** | Visualización de Mercado Avanzada (Gráficos interactivos y multi-timeframe) | ⏳ Próximo |
| | **4.3** | Panel de Administración y Filtro Free vs Pro en Frontend | ⏳ Próximo |
| **Fase 5** | **5.1** | AI Briefing Automatizado (Pipeline de noticias + contexto macro) | ⏳ Planificado |
| **Fase 8** | **8.1** | Mobile Readiness Audit & Preparación de APIs para iOS/Android | ⏳ Planificado |

---

## 2. Hitos y Capacidades Operativas Recientes

### A. Calendario Económico y Macro (Fase 3 Completa)
1. **Infraestructura de Datos Autónoma (`Aeon_Bot`):**
   - Extractor de ForexFactory con `curl_cffi` resistente a Cloudflare.
   - **Auto-detección dinámica de zona horaria:** Lee `timezone_name` del HTML para generar timestamps UTC idénticos desde cualquier región del mundo, evitando duplicados.
   - **Modo Ultra-Rápido Diario (`< 0.5s`):** Consulta directa de `day=today` en horario operativo y pre-carga mensual (`--month`) los domingos.
   - **Ráfaga de 3 disparos en GitHub Actions:** Programado a los minutos `:01` (60s post-anuncio), `:03` (reintento rápido) y `:06` (confirmación final).
   - Consumo de recursos contenido: ~390 min/mes (< 20% del cupo gratuito de GitHub).

2. **Frontend Interactivo en Tiempo Real (`AEON`):**
   - **Supabase Realtime:** Suscripción por WebSockets en `calendar.js`; las filas pasan de *"Pendiente"* al dato real con color y análisis sin que el usuario recargue la página.
   - **Buscador con Alias Expandido:** Búsqueda rápida por acrónimos comunes (`NFP`, `CPI`, `FED`, `FOMC`, `PMI`, `GDP`, `PIB`, `DESEMPLEO`).
   - **Filtros Institucionales:** Filtros limpios sin sobrecarga visual (`Alto + Medio`, `Alto Impacto`, `Medio Impacto`).
   - **Lógica de Indicadores Invertidos:** Detección automática de métricas donde un aumento es negativo para la divisa (Solicitudes de desempleo, Tasa de desempleo, Déficit comercial).

### B. Plataforma de Datos y Auth
1. **Precios y Porcentajes en Vivo (OANDA Edge Function):**
   - Cálculo dinámico de variación diaria en tiempo real para XAU/USD, EUR/USD, SPX500, NAS100 y US30.
   - Caché en cliente (`sessionStorage` y `localStorage`) para renderizado instantáneo en 0ms.
2. **Autenticación y Seguridad:**
   - Panel de usuario *"Mi Perfil"* (`perfil.html`) con gestión de cuenta y suscripción.
   - Políticas RLS activas en Supabase para proteger datos PRO (`signals_pro_data`).
   - Aislamiento estricto de secretos de servidor (OANDA, Supabase Service Role) fuera del frontend.

---

## 3. Próximo Objetivo Inmediato: Fase 4 (Señales & Mercados)

1. **Refinamiento del Motor de Señales (`Aeon_Bot/signals/`):**
   - Estandarización de reglas cuantitativas (Silver Bullet / Liquidez) para Oro (XAU/USD), EUR/USD y GBP/USD.
   - Inyección automática desde el bot a las tablas `signals` (pública) y `signals_pro_data` (niveles privados para usuarios PRO).
2. **Despliegue de Señales en Frontend (`AEON/src/js/`):**
   - Renderizado en vivo con WebSockets, tarjetas interactivas de confluencias y desenfoque con candado para usuarios Free.
