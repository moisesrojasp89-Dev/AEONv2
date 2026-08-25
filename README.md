# AEON | Terminal de Inteligencia Macroeconómica y Mercados

AEON es una plataforma profesional de inteligencia macroeconómica, análisis de mercados y señales cuantitativas diseñada para traders e inversores. Construida con una estética sobria de terminal financiero (Glassmorphism + Dark Mode), entrega contexto rápido, datos en tiempo real y análisis institucional sin fricciones.

---

## 🚀 Tecnologías Core

- **Frontend:** Vanilla HTML5, CSS3 (Variables & Glassmorphism Tokens), JavaScript (ES6 Modules). Sin frameworks pesados para garantizar máxima velocidad de carga.
- **Bundler & Build Tool:** [Vite](https://vitejs.dev/) — Empaquetado optimizado, HMR instantáneo y compilación a producción ligera.
- **Backend & Base de Datos:** [Supabase](https://supabase.com/) — PostgreSQL, Row Level Security (RLS), Supabase Auth y sincronización por WebSockets (Supabase Realtime).
- **Agentes & Automatización (Backend):** Python (`Aeon_Bot`) con `curl_cffi`, `BeautifulSoup` y ejecutor programado en GitHub Actions.
- **Hosting & CI/CD:** [Vercel](https://vercel.com/) (Frontend) y GitHub Actions (Backend Agentes).
- **Widgets de Mercado:** TradingView Mini Symbol Overview y cotizaciones en vivo vía Edge Functions de OANDA.

---

## 📁 Arquitectura del Ecosistema

El ecosistema de AEON se estructura en dos proyectos independientes conectados a través de Supabase:

```text
┌─────────────────────────────────────────────────────────┐
│ BACKEND: Aeon_Bot (Python & Agentes 24/7)               │
│  ├── agents/calendar_agent.py (Scraper ForexFactory)    │
│  ├── signals/ (Motor de Señales Cuantitativas)          │
│  └── delivery/telegram_bot.py (Alertas a la comunidad)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼ (Escribe vía Service Role)
┌─────────────────────────────────────────────────────────┐
│ BASE DE DATOS: Supabase (PostgreSQL en la Nube)         │
│ Tablas: economic_calendar, signals, signals_pro_data,   │
│         profiles, news                                  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼ (Lectura en tiempo real vía WebSockets)
┌─────────────────────────────────────────────────────────┐
│ FRONTEND: AEON Web (aeondev.vercel.app)                 │
│ Interfaz de usuario interactiva y terminal del trader   │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 Estructura de Archivos del Frontend (`AEON`)

### Páginas Principales
- `index.html` — Landing page interactiva: Hero, Briefing macro, Radar de Mercados y Señales institucionales.
- `calendario.html` — Calendario económico institucional (8 columnas desktop / 4 columnas móvil con acordeón interactivo, buscador de alias y widget DXY).
- `login.html` / `registro.html` — Flujos de autenticación conectados a Supabase Auth.
- `recuperar.html` / `actualizar-password.html` — Flujo seguro de recuperación de credenciales.
- `perfil.html` — Panel privado del trader: gestión de cuenta, nivel de membresía (Free/Pro) y seguridad.
- `aviso-legal.html` / `privacidad.html` / `cookies.html` — Documentación legal y cumplimiento normativo.

### Módulos de Lógica (`/src/js/`)
- `main.js` — Orquestador de la vista principal (`index.html`).
- `calendar.js` — Controlador del calendario, filtros dinámicos y escucha de Supabase Realtime.
- `supabaseClient.js` — Cliente singleton seguro de Supabase.
- `auth.js` — Gestión de sesiones, login, registro y recuperación de contraseña.
- `render.js` — Renderizado dinámico de componentes y actualización de DOM.
- `services/` — Capa de datos desacoplada (`calendarService.js`, `marketService.js`, `signalService.js`, `newsService.js`).
- `templates/` — Plantillas HTML puras y sanitizadas (`calendarItem.js`, `signal.js`, `market.js`, `news.js`).
- `utils/sanitize.js` — Blindaje contra vulnerabilidades XSS (`escapeHTML`, `sanitizeUrl`).

### Estilos (`/src/css/`)
- `variables.css` — Tokens de diseño (paleta de color, tipografías Space Grotesk/Inter, radios, elevaciones).
- `layout.css`, `reset.css`, `animations.css`, `responsive.css` — Estructura base y reglas adaptativas.
- `components/` — Estilos encapsulados (`calendar.css`, `navbar.css`, `market.css`, `signals.css`, `hero.css`, etc.).

---

## 🛠️ Estado Actual del Desarrollo (Fases del Master Plan)

* ✅ **Fase 0 — Auditoría y Seguridad:** Credenciales privadas aisladas en backend/GitHub Secrets; sanitización XSS completa.
* ✅ **Fase 1 — Foundation & Arquitectura:** Servicios desacoplados, constantes centralizadas (`CONVENTIONS.md`) y sesión persistente.
* ✅ **Fase 2 — Data Platform:** Integración con OANDA Edge Function para variación porcentual diaria real y caché en cliente de 0ms.
* ✅ **Fase 3 — Calendario Económico y Macro:**
  - 74 eventos con descripciones macroeconómicas, catalizadores y activos en radar.
  - Lógica direccional (Beat/Miss) con soporte para indicadores invertidos (Desempleo).
  - Bot autónomo en Python (`Aeon_Bot`) con auto-detección de zona horaria de ForexFactory y ráfaga de 3 disparos en GitHub Actions (`:01, :03, :06`).
  - Sincronización en vivo sin recargar pantalla vía Supabase Realtime.
* 🚀 **Fase 4 — Market Intelligence & Señales (En Curso):**
  - Motor de señales cuantitativas (Silver Bullet / Oro / Forex).
  - Conexión de señales a Supabase (`signals` y `signals_pro_data` con RLS Pro).
* ⏳ **Fase 5+ — AI Briefing, Quant Engine & Mobile Platform (iOS/Android).**

---

## 📜 Guía y Documentación Interna

Para consultar los estándares técnicos y planes estratégicos del proyecto:
- [Master Plan v2.0](docs/AEON_Master_Plan_v2.md) — Visión del producto, arquitectura y roadmap completo.
- [Convenciones Técnicas](docs/CONVENTIONS.md) — Normas de código, CSS, seguridad y commits.
- [Estado vs Objetivo](docs/CURRENT_STATE_VS_TARGET.md) — Bitácora de seguimiento de sprints.
