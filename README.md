# AEON | Macro & Trading

AEON es una plataforma de análisis macroeconómico y señales educativas para traders profesionales. Diseñada con una estética premium (Glassmorphism), su objetivo es entregar contexto rápido y de alto valor sin fricciones.

## 🚀 Tecnologías Core

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6 Modules). Sin frameworks pesados para garantizar la máxima velocidad de carga.
- **Bundler & Build Tool:** [Vite](https://vitejs.dev/) - Utilizado para empaquetar el CSS, JS y preparar el proyecto para producción de manera instantánea.
- **Backend & Auth:** [Supabase](https://supabase.com/) - Autenticación de usuarios y base de datos (PostgreSQL).
- **Hosting:** [Vercel](https://vercel.com/) - Despliegues continuos rápidos.
- **Widgets:** TradingView Lightweight Scripts.

## 📁 Arquitectura del Proyecto

El proyecto sigue una estructura modular estricta para garantizar la mantenibilidad y escalabilidad a medida que crece.

### Páginas Principales (Raíz)
- `index.html` - Landing page interactiva. Contiene el Hero, Briefing (Live Feed), Mercados y Señales.
- `calendario.html` - Calendario económico de alto impacto (estructura 75/25 en desktop) con sidebar de contexto (DXY).
- `login.html` / `registro.html` - Flujos de autenticación conectados a Supabase.
- `perfil.html` - Área privada del trader: gestión de perfil, membresía y seguridad.

### Estilos (`/src/css/`)
Sistema de diseño atomizado:
- `variables.css`: Tokens de diseño (colores, tipografías, radios, transiciones). Base del tema oscuro.
- `reset.css`: Normalización del navegador.
- `layout.css`: Estructura general, contenedores y tipografía base.
- `animations.css`: Keyframes para efectos visuales (pulso, fade in).
- `responsive.css`: Reglas globales para adaptación a móviles y tablets.
- `components/*.css`: Estilos encapsulados por sección (`hero.css`, `calendar.css`, `news.css`, `navbar.css`, etc.).

### Lógica (`/src/js/`)
- `main.js`: Punto de entrada de `index.html`. Inicializa los componentes y orquesta la carga de datos.
- `calendar.js`: Lógica específica de `calendario.html` (Renderizado de tabla y TradingView).
- `supabaseClient.js`: Conexión inicial segura con Supabase usando variables de entorno de Vite.
- `auth.js`: Controladores de registro, login y gestión de sesión.
- `render.js`: Funciones puras para inyectar HTML dinámico en el DOM basado en datos.
- `templates/*.js`: Template literals exportados para mantener el HTML dinámico limpio y separado de la lógica.

### Datos (`/src/data/`)
- `markets.json`: Única fuente de verdad temporal (Mock Data) que alimenta el Hero, las Señales, el Briefing y el Calendario. Facilita la futura migración a una base de datos real en Supabase.

## 🛠️ Estado Actual y Resoluciones Clave

- **UI/UX Premium:** Transición completa a un diseño de alto nivel usando desenfoques de fondo, bordes sutiles y tipografía geométrica (Space Grotesk + Inter).
- **Anti-AdBlocker:** Las clases CSS que inyectan los módulos críticos del calendario y el briefing fueron auditadas y renombradas (ej. `radar` -> `eco-head`) para evadir el borrado silencioso por extensiones como uBlock Origin.
- **Performance:** Carga de JavaScript asíncrona no bloqueante. El renderizado del DOM no espera la confirmación de la sesión de Supabase, eliminando los tiempos de pantalla blanca.
- **Responsive:** Reglas sólidas de Mobile-First con "Fallbacks" específicos para tablas complejas, evitando que el contenido se desborde o se vea "gigante" en móviles.

## 🗺️ Próximos Pasos (Roadmap)

1. **Integración de Pagos (Stripe):** Conectar el botón "Acceso Pro" con Stripe Checkout y usar Webhooks para actualizar el nivel del usuario (Tier) en Supabase de forma segura.
2. **Dashboard Privado:** Construir el área protegida donde los usuarios Pro consumirán el contenido educativo y las señales avanzadas.
3. **Migración de Datos:** Mover `markets.json` a tablas relacionales en Supabase para permitir actualización en tiempo real desde un panel de administrador.

---
*Documento mantenido para referencia arquitectónica rápida.*


## Phase 6 Architecture Updates (Current)
* **Economic Calendar:** Migrated from static JSON to a Supabase PostgreSQL database (`economic_calendar` table).
* **UI/UX:** Fully responsive Mobile UI with accordion for data stats. Fixed Desktop dropdown issues with dark mode styling. Added dynamic "Próximo Catalizador" widget that calculates time remaining for the next HIGH impact event.
* **Scraper (WIP):** Moving from `requests` to a `Playwright` headless browser to bypass ForexFactory/Investing limits and capture real-time "Actual" data.
