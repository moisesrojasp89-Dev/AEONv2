# AEON — Technical Conventions & Architecture Standards

> **Guía oficial de desarrollo para el equipo de AEON Terminal.**

---

## 1. Principios de Arquitectura

1. **Evolución continua, sin reescrituras destructivas:**
   * Cualquier cambio debe preservar la funcionalidad y diseño actual.
   * Los componentes se refactorizan incrementalmente.

2. **Seguridad First (Zero-Trust en Cliente):**
   * **Variables de entorno:** Solo las variables con prefijo `VITE_` son públicas (ej. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
   * **Secretos:** `SUPABASE_SERVICE_ROLE_KEY`, `OANDA_TOKEN`, `TWELVEDATA_API_KEY` son estrictamente de backend / Edge Functions y **NUNCA** deben llevar prefijo `VITE_` ni importarse en el código cliente.
   * **Sanitización XSS:** Cualquier dato proveniente de bases de datos o APIs externas debe pasar por `escapeHTML()` de `src/js/utils/sanitize.js` antes de renderizarse en plantillas `innerHTML`.
   * **Enlaces externos:** Usar siempre `sanitizeUrl()` para evitar inyección de pseudo-protocolos `javascript:`.

3. **Separación de Capas:**
   * `src/js/config/`: Constantes del sistema, nombres de tablas, timeouts.
   * `src/js/services/`: Lógica de comunicación con APIs, base de datos y adaptadores.
   * `src/js/templates/`: Generadores de HTML puros y sanitizados.
   * `src/js/utils/`: Funciones utilitarias reutilizables.
   * `src/js/main.js` / `src/js/calendar.js`: Controladores y orquestadores de vista.

---

## 2. Design System & CSS

2. **Tokens de Diseño (`src/css/variables.css`):**
   * Usar siempre variables CSS para colores, fuentes, radios y capas:
     * Colores de Marca & Acentos: `var(--accent)`, `var(--accent-hover)`, `var(--accent-dim)`, `var(--accent-border)`, `var(--accent-glow)`
     * Semánticos: `var(--green)`, `var(--red)`, `var(--yellow)`, `var(--purple)`
     * Paleta Neutral Slate: `var(--slate-500)`, `var(--slate-400)`, `var(--slate-200)`, `var(--slate-50)`
     * Superficies: `var(--bg)`, `var(--surface)`, `var(--surface-2)`, `var(--border)`, `var(--border-2)`
     * Tipografía: `var(--font-head)` (Space Grotesk), `var(--font-body)` (Inter), `var(--font-mono)` (JetBrains Mono)
     * Radios: `var(--radius-xs)`, `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-pill)`, `var(--radius-circle)`
     * Capas Z-Index Canónicas: `var(--z-behind: -1)`, `var(--z-base: 1)`, `var(--z-above: 2)`, `var(--z-sticky: 10)`, `var(--z-nav: 900)`, `var(--z-overlay: 998)`, `var(--z-drawer: 999)`, `var(--z-modal: 1000)`
   * **Prohibido el uso de colores hexadecimales hardcodeados** en componentes si existe un token equivalente.
   * **Prohibición estricta de `!important`:** Toda especificidad debe resolverse mediante la cascada natural y arquitectura BEM.

3. **Compatibilidad Glassmorphism:**
   * Cada contenedor con `backdrop-filter: blur(...)` debe incluir su contraparte `-webkit-backdrop-filter: blur(...)` para soporte completo en Safari e iOS.

4. **Convención BEM y Nomenclatura UI:**
   * Evitar selectores de clase genéricos que colisionen globalmente (ej: usar `.btn-nav-ghost` en navbar en lugar de `.btn-ghost`).
   * **Copia Institucional Limpia (Cero Posesivos Redundantes):** En barras de navegación y menús de usuario autenticado, utilizar términos objetivos directos: **`Perfil`** (nunca *"Mi Perfil"*) y **`CUENTA`** (nunca *"MI CUENTA"*).

5. **Paridad Dimensional en Componentes Móviles (Carruseles):**
   * En contenedores con desplazamiento horizontal táctil (`scroll-snap-type: x mandatory`), el contenedor padre debe declarar `align-items: stretch` y las tarjetas `align-self: stretch` con estructura vertical elástica (`flex: 1 1 auto` en cajas de contenido y `margin-top: auto` en filas de acción) para garantizar **0.00px de variación de altura** entre tarjetas adyacentes.

6. **Accesibilidad y Movimiento:**
   * Las animaciones continuas (como el ticker) deben usar aceleración por hardware (`translate3d(0, 0, 0)`) y no deben romper el layout visual en navegadores de escritorio.

---

## 3. Manejo de Estado y Supabase

1. **Cliente Supabase:**
   * Importar siempre la instancia singleton desde `src/js/supabaseClient.js`.
   * Usar constantes centralizadas de `src/js/config/constants.js` para nombres de tablas (`DB_TABLES.SIGNALS`, etc.).

2. **Manejo de Errores en UI:**
   * Nunca inyectar `err.message` crudo de la base de datos dentro de `innerHTML` en componentes de producción. Usar estados vacíos amigables y registrar el error con `console.error()`.

---

## 4. Convención de Commits (Conventional Commits)

Los mensajes de commit deben seguir el estándar:
* `security(...)`: Correcciones de seguridad y credenciales.
* `fix(...)`: Corrección de errores en funcionalidad o UI.
* `feat(...)`: Nuevas funcionalidades del Master Plan.
* `style(...)`: Cambios visuales, CSS, tokens o formato.
* `refactor(...)`: Reestructuración de código sin alterar comportamiento.
* `chore(...)`: Tareas de mantenimiento, scripts o configuración.

---

## 5. Gobernanza Cuantitativa y Políticas de Señales (Protocolo Sonnet)

1. **Universo de Activos Permitidos:**
   * Permitidos para Investigación y Backtesting: `XAUUSD`, `NAS100`, `EURUSD`, `BTCUSD`.
   * Prohibidos / Descartados Definitivamente: `GBPUSD`, `SPX500` (descartados por redundancia y dispersión).

2. **Certificación Obligatoria Previas a Emisión en Vivo:**
   * Cero estrategias en producción sin backtesting de $\ge 1$ año con Walk-Forward (10 ventanas), test anti look-ahead y Quality Gates ($PF \ge 1.35, SR \ge 1.30, DD \le 12.0\%$).
   * Cualquier bot o daemon en desarrollo correrá **estrictamente en `SHADOW_MODE`**, almacenando telemetría interna sin acceso para usuarios Pro de pago hasta contar con certificación oficial.

