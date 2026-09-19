# 📐 AEON — Convenciones Técnicas, Estándares de Código y Topología

**Documento:** `docs/CONVENTIONS.md`  
**Estado:** Guía Oficial de Estilo, Modularidad y Convivencia en el Repositorio  
**Versión:** 2.2.0 (Certificación de Ingeniería Senior)  
**Fecha de Aprobación:** Septiembre de 2026  
**Documento Complementario:** [`docs/ESTRUCTURA_DEL_PROYECTO.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/ESTRUCTURA_DEL_PROYECTO.md)  

---

## 🌳 1. Estructura Modular del Proyecto

Para evitar archivos monolíticos y garantizar que cualquier ingeniero o IA mantenga el orden arquitectónico sin crear deuda técnica, el repositorio de **AEON Terminal** sigue una arquitectura desacoplada por capas:

```text
AEON/
├── 🌐 Vistas HTML (Multi-Page Application)
│   ├── index.html                           # Landing & Terminal Principal (Radar, Briefings, Playbooks)
│   ├── mercados.html                        # Radar Institucional Extendido (17 Activos en Vivo)
│   ├── analisis.html                        # Terminal de Análisis Estructural (Lightweight Charts v5)
│   ├── calendario.html                      # Calendario Macroeconómico Sniper 24h & Catalizadores Tier 1
│   ├── perfil.html                          # Command Center del Trader & AI Trader Journal (4 KPI Cards)
│   ├── admin-pagos.html                     # Panel Administrativo Móvil para Pagos Cripto
│   ├── login.html, registro.html            # Flujos de Autenticación Soberana con Supabase Auth
│   ├── recuperar.html, actualizar-password.html # Restablecimiento Seguro de Contraseñas
│   ├── terminos.html, privacidad.html       # Marco Legal Institucional y Clickwrap PRO
│   ├── aviso-legal.html, cookies.html       # Descargo No-Financial-Advice (NFA) y Cookies
│   └── 404.html                             # Página de Error Personalizada Dark Luxury
│
├── 🎨 src/css/ (Design System & Hojas de Estilo BEM)
│   ├── variables.css                        # Tokens Canónicos: Colores, Tipografías, Radios y Z-Index
│   ├── reset.css, layout.css, responsive.css# Normalización, Contenedores Grid/Flex y Media Queries
│   ├── animations.css, auth.css             # Keyframes, Pulso Cian (.card-live-pulse) y Auth Views
│   └── components/                          # Estilos Modulares por Componente
│       ├── navbar.css, hero.css, ticker.css # Header Sticky, Hero Section y Marquee Continuo
│       ├── market.css, analysis.css         # Tarjetas de Mercados y Gráficos Canvas LW v5
│       ├── calendar.css, chat.css           # Calendario Macro y Widget Flotante del Copilot
│       ├── perfil.css, macro-hud.css        # Command Center, Pestañas ARIA y HUD del Fed
│       ├── education.css, buttons.css       # Carrusel de Playbooks y Botones BEM
│       ├── form-controls.css, footer.css    # Formularios Accesibles y Footer Institucional
│       └── legal.css, premium.css           # Documentos Legales y Modales Paywall PRO
│
├── ⚡ src/js/ (Lógica de Aplicación Frontend - Vanilla JS Modular)
│   ├── main.js, markets.js, analysis.js     # Controladores de Vista (index, mercados, analisis)
│   ├── calendar.js, perfil.js, admin-pagos.js # Controladores de Calendario, Perfil y Pagos
│   ├── auth.js, navbar.js, supabaseClient.js# Autenticación, Hidratación Centralizada y Cliente DB
│   ├── chart.js, prices.js, render.js       # Lightweight Charts Canvas v5, Ticks y Render DOM
│   ├── components/                          # Componentes Complejos (chatWidget.js, educationModal.js)
│   ├── config/                              # Constantes Inmutables (constants.js)
│   ├── services/                            # Servicios de Red (market, analysis, chat, macro, news)
│   ├── templates/                           # Generadores HTML Puros Sanitizados (marketCard, etc.)
│   └── utils/                               # Utilidades de Seguridad (sanitize.js con escapeHTML)
│
├── 📦 src/data/ (Snapshots de Resiliencia Offline)
│   ├── market_intelligence_snapshot.json    # Snapshot de Emergencia de los 17 Activos
│   ├── analysis_snapshot.json, economic_calendar_snapshot.json # Snapshots de POI y Calendario
│   ├── macro_liquidity_snapshot.json        # Snapshot de Indicadores de la Reserva Federal
│   └── markets.json, education.json         # Metadatos Fijos de Instrumentos y 5 Playbooks
│
├── 🐍 scripts/ (Daemons Autónomos 24/7 & Laboratorio Cuantitativo)
│   ├── ai/                                  # Motores de IA (aeon_autonomous_engine, trader_journal_harness)
│   ├── quant/                               # Algoritmos Cuantitativos (harness_sentinel, dpoc_engine, WFO)
│   ├── db/                                  # Scripts SQL de Soporte para Macro y Mercados
│   └── archive/                             # Scripts Legacy Preservados para Trazabilidad
│
├── ☁️ supabase/ (Infraestructura Soberana de Base de Datos & Edge Functions)
│   ├── migrations/                          # 14 Migraciones SQL Versionadas (RLS Zero-Trust, RPCs)
│   └── functions/                           # Edge Functions Serverless (aeon-chat, aeon-copilot-event)
│
├── 🧪 tests/ (Batería de Pruebas Automatizadas)
│   ├── test_harness_mas.py, test_trader_journal_harness.py # Pruebas del Orquestador y Ratchet
│   └── test_mas_anti_oracle_and_context.py, test_post_mortem_mas.py # Anti-Oracle y Forense
│
├── 🚀 deploy/ (Infraestructura de Servidor VPS Linux)
│   ├── Dockerfile, docker-compose.yml       # Contenedores Docker Aislados para Daemons
│   └── aeon-quant-daemon.service            # Unidad Systemd para Linux Ubuntu 24.04 LTS
│
└── 📚 docs/ (Suite de Documentación Técnica Senior)
    ├── INDEX.md                             # Índice Maestro y Mapa de Gobernanza
    ├── ESTRUCTURA_DEL_PROYECTO.md           # Topología Exhaustiva y Explicación de Archivos
    ├── CURRENT_STATE_VS_TARGET.md           # Diagnóstico en Tiempo Real, C4 N2 y Secuencias
    ├── ENGINEERING_STANDARDS.md             # Estándares Cuantitativos KaTeX y Quality Gates
    └── GUIA_HARNESS_ENGINEERING.md          # Especificación de Sistemas Agénticos y ERD Supabase
```

---

## 🏛️ 2. Principios de Arquitectura & Zero-Trust

1. **Evolución Continua, sin Reescrituras Destructivas:**
   * Cualquier cambio debe preservar la funcionalidad y diseño actual.
   * Los componentes se refactorizan incrementalmente con verificación inmediata.

2. **Seguridad First (Zero-Trust en Cliente):**
   * **Variables de Entorno:** Solo las variables con prefijo `VITE_` son públicas (ej. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
   * **Secretos Privilegiados:** `SUPABASE_SERVICE_ROLE_KEY`, `OANDA_TOKEN`, `GEMINI_API_KEY` residen estrictamente en el backend / VPS / Edge Functions y **NUNCA** deben llevar prefijo `VITE_` ni importarse en el código cliente.
   * **Sanitización XSS Obligatoria:** Todo dato proveniente de bases de datos o APIs externas debe pasar por `escapeHTML()` de `src/js/utils/sanitize.js` antes de renderizarse en plantillas `innerHTML`.
   * **Enlaces Externos Seguros:** Usar siempre `sanitizeUrl()` para evitar inyección de pseudo-protocolos `javascript:`.

3. **Separación Estricta de Capas:**
   * `src/js/config/`: Constantes del sistema, nombres canónicos de tablas, timeouts.
   * `src/js/services/`: Lógica de red, llamadas a Supabase y adaptadores de datos.
   * `src/js/templates/`: Generadores de HTML puros, deterministas y sanitizados.
   * `src/js/utils/`: Funciones utilitarias puras y reutilizables.
   * `src/js/main.js`, `markets.js`, `analysis.js`: Controladores y orquestadores de vista.

---

## 🎨 3. Design System & Estándares CSS

1. **Tokens de Diseño Canónicos (`src/css/variables.css`):**
   * Usar siempre variables CSS para colores, fuentes, radios y capas:
     * Colores de Marca & Acentos: `var(--accent)`, `var(--accent-hover)`, `var(--accent-dim)`, `var(--accent-border)`, `var(--accent-glow)`
     * Semánticos: `var(--green)`, `var(--red)`, `var(--yellow)`, `var(--purple)`
     * Paleta Neutral Slate: `var(--slate-500)`, `var(--slate-400)`, `var(--slate-200)`, `var(--slate-50)`
     * Superficies: `var(--bg)`, `var(--surface)`, `var(--surface-2)`, `var(--border)`, `var(--border-2)`
     * Tipografía: `var(--font-head)` (Space Grotesk), `var(--font-body)` (Inter), `var(--font-mono)` (JetBrains Mono)
     * Radios: `var(--radius-xs)`, `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-pill)`, `var(--radius-circle)`
     * Capas Z-Index Canónicas: `var(--z-behind: -1)`, `var(--z-base: 1)`, `var(--z-above: 2)`, `var(--z-sticky: 10)`, `var(--z-nav: 900)`, `var(--z-overlay: 998)`, `var(--z-drawer: 999)`, `var(--z-modal: 1000)`
   * **Prohibido el uso de colores hexadecimales hardcodeados** en componentes si existe un token equivalente en `variables.css`.
   * **Prohibición estricta de `!important`:** Toda especificidad debe resolverse mediante la cascada natural y arquitectura BEM.

2. **Compatibilidad Glassmorphism:**
   * Cada contenedor con `backdrop-filter: blur(...)` debe incluir su contraparte `-webkit-backdrop-filter: blur(...)` para soporte completo en Safari e iOS.

3. **Convención BEM y Nomenclatura UI:**
   * Evitar selectores de clase genéricos que colisionen globalmente (ej: usar `.btn-nav-ghost` en navbar en lugar de `.btn-ghost`).
   * **Copia Institucional Limpia:** En barras de navegación y menús de usuario autenticado, utilizar términos objetivos directos: **`Perfil`** (nunca *"Mi Perfil"*) y **`CUENTA`** (nunca *"MI CUENTA"*).

4. **Paridad Dimensional en Componentes Móviles (Carruseles):**
   * En contenedores con desplazamiento horizontal táctil (`scroll-snap-type: x mandatory`), el contenedor padre debe declarar `align-items: stretch` y las tarjetas `align-self: stretch` con estructura vertical elástica (`flex: 1 1 auto` en cajas de contenido y `margin-top: auto` en filas de acción) para garantizar **0.00px de variación de altura** entre tarjetas adyacentes.

5. **Aceleración por Hardware:**
   * Las animaciones continuas (como el ticker marquee) deben usar aceleración por GPU (`translate3d(0, 0, 0)`) y no deben romper el layout en pantallas de escritorio.

---

## 🗄️ 4. Manejo de Estado y Supabase

1. **Cliente Supabase Singleton:**
   * Importar siempre la instancia singleton desde `src/js/supabaseClient.js`.
   * Usar constantes centralizadas de `src/js/config/constants.js` para nombres de tablas (`DB_TABLES.TRADER_JOURNAL`, `DB_TABLES.MARKET_INTELLIGENCE`, etc.).

2. **Manejo de Errores en UI:**
   * Nunca inyectar `err.message` crudo de la base de datos dentro de `innerHTML` en componentes de producción. Usar estados vacíos amigables y registrar el error con `console.error()`.

---

## 💬 5. Convención de Commits (Conventional Commits)

Los mensajes de commit deben seguir el estándar:
* `feat(...)`: Nuevas funcionalidades del Master Plan.
* `fix(...)`: Corrección de errores en funcionalidad o UI.
* `docs(...)`: Actualizaciones en la suite documental técnica.
* `style(...)`: Cambios visuales, CSS, tokens o formato.
* `refactor(...)`: Reestructuración de código sin alterar comportamiento.
* `security(...)`: Endurecimiento de seguridad, RLS o credenciales.
* `chore(...)`: Tareas de mantenimiento, scripts o configuración de builds.

---

## 📊 6. Gobernanza Cuantitativa y Políticas de Señales (Protocolo Sonnet)

1. **Universo de Activos Permitidos:**
   * Permitidos para Investigación y Backtesting: `XAUUSD`, `NAS100`, `EURUSD`, `BTCUSD`.
   * Prohibidos / Descartados Definitivamente: `GBPUSD`, `SPX500` (descartados por redundancia de correlación $> 0.85$ y dispersión ineficiente de liquidez).

2. **Certificación Obligatoria Previas a Emisión en Vivo:**
   * Cero estrategias en producción sin backtesting de $\ge 1$ año con Walk-Forward (10 ventanas), test anti look-ahead y Quality Gates ($PF \ge 1.35, SR \ge 1.30, DD \le 12.0\%$).
   * Cualquier bot o daemon en desarrollo correrá **estrictamente en `SHADOW_MODE`**, almacenando telemetría interna sin acceso para usuarios Pro de pago hasta contar con certificación oficial.
