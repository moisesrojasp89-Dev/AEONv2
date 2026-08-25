# AEON | Terminal de Inteligencia Macroeconómica, Mercados y Señales Cuantitativas

AEON es una plataforma profesional de inteligencia macroeconómica, análisis de mercados y señales cuantitativas diseñada para traders e inversores. Construida con una estética sobria de terminal financiero (Glassmorphism + Dark Mode), entrega contexto rápido, datos en tiempo real y análisis institucional sin fricciones.

---

## 🚀 Tecnologías Core

- **Frontend:** Vanilla HTML5, CSS3 (Variables & Glassmorphism Tokens), JavaScript (ES6 Modules). Sin frameworks pesados para garantizar máxima velocidad de carga.
- **Bundler & Build Tool:** [Vite](https://vitejs.dev/) — Empaquetado optimizado, HMR instantáneo y compilación a producción ultraligera.
- **Backend & Base de Datos:** [Supabase](https://supabase.com/) — PostgreSQL, Row Level Security (RLS) server-side, Supabase Auth y sincronización por WebSockets (Supabase Realtime).
- **Agentes Cuantitativos & Automatización (Backend):** Python (`Aeon_Bot`) con `curl_cffi`, detector de régimen ADX ($N=3$), motor adaptativo de Order Flow (Volume Profile POC, Session VWAP, SMA 20) y Trade Watcher automático.
- **Hosting & CI/CD:** [Vercel](https://vercel.com/) (Frontend: `aeondev.vercel.app`) y GitHub Actions (Backend Agentes).

---

## 📁 Arquitectura del Ecosistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ BACKEND: Aeon_Bot (Python & Agentes 24/7 en GitHub Actions)             │
│  ├── analysis/regime_detector.py (Detector ADX con ventana N=3)         │
│  ├── analysis/adaptive_engine.py (Volume Profile POC, VWAP, SMA 20)     │
│  ├── analysis/scorer.py (Score institucional 0-100 ponderado)           │
│  ├── scheduler/watcher.py (Trade Lifecycle: ACTIVE -> BE -> CLOSED)     │
│  ├── delivery/supabase_client.py (Entrega idempotente Free/Pro)         │
│  └── delivery/telegram_bot.py (Alertas instantáneas a la comunidad)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (Escribe vía Service Role)
┌─────────────────────────────────────────────────────────────────────────┐
│ BASE DE DATOS: Supabase (PostgreSQL en la Nube)                         │
│ Tablas: economic_calendar, signals, signals_pro_data, profiles, news    │
│ Seguridad: RLS Server-Side (Protege precios exactos para usuarios Free) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (Lectura en tiempo real vía WebSockets)
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND: AEON Web (aeondev.vercel.app)                                 │
│  ├── Terminal de Señales Cuantitativas (KPI bar, tabs, scroll móvil)   │
│  ├── Calendario Económico Institucional (8 cols + acordeón contextual) │
│  └── Briefing Macroeconómico & Cotizaciones en Vivo                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 Estructura de Archivos del Frontend (`AEON`)

### Páginas Principales
- `index.html` — Landing page interactiva: Hero, Briefing macro, Radar de Mercados y Terminal de Señales Institucionales.
- `calendario.html` — Calendario económico institucional (8 columnas desktop / 4 columnas móvil con acordeón interactivo, buscador de alias y widget DXY).
- `login.html` / `registro.html` — Flujos de autenticación conectados a Supabase Auth.
- `recuperar.html` / `actualizar-password.html` — Flujo seguro de recuperación de credenciales.
- `perfil.html` — Panel privado del trader: gestión de cuenta, nivel de membresía (Free/Pro) y seguridad.
- `aviso-legal.html` / `privacidad.html` / `cookies.html` — Documentación legal y cumplimiento normativo.

### Módulos de Lógica (`/src/js/`)
- `main.js` — Orquestador de la vista principal, filtros de señales y noticias en tiempo real.
- `calendar.js` — Controlador del calendario, filtros dinámicos y escucha de Supabase Realtime.
- `supabaseClient.js` — Cliente singleton seguro de Supabase.
- `auth.js` — Gestión de sesiones, detección de rol PRO/Free y flujos de autenticación.
- `render.js` — Renderizado dinámico de componentes y actualización de DOM.
- `services/` — Capa de datos desacoplada (`signalService.js`, `calendarService.js`, `marketService.js`, `newsService.js`).
- `templates/` — Plantillas HTML puras y sanitizadas (`signal.js`, `calendarItem.js`, `market.js`, `news.js`).
- `utils/sanitize.js` — Blindaje contra vulnerabilidades XSS (`escapeHTML`, `sanitizeUrl`).

### Estilos (`/src/css/`)
- `variables.css` — Tokens de diseño (paleta de color, tipografías Space Grotesk/Inter, radios, elevaciones).
- `layout.css`, `reset.css`, `animations.css`, `responsive.css` — Estructura base y reglas adaptativas.
- `components/` — Estilos encapsulados (`signals.css`, `calendar.css`, `navbar.css`, `market.css`, `hero.css`, etc.).

---

## 🧪 Cuentas de Prueba Configuradas en Desarrollo

| Email | Tier | Estado en la Web |
|---|:---:|---|
| **`malejandro.rp19@gmail.com`** | 🟢 **PRO** | Desbloqueo numérico total (Entrada, SL, Target, R:R). |
| **`cmroyalglobal@gmail.com`** | 🔒 **FREE** | Bloqueado con blur (Tesis y chips visibles; precios difuminados con botón CTA). |

---

## 📦 Scripts de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo local
npm run dev

# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview
```
