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

1. **Tokens de Diseño (`src/css/variables.css`):**
   * Usar siempre variables CSS para colores, fuentes y radios:
     * Colores: `var(--accent)`, `var(--green)`, `var(--red)`, `var(--yellow)`, `var(--purple)`
     * Superficies: `var(--bg)`, `var(--surface)`, `var(--surface-2)`, `var(--border)`
     * Tipografía: `var(--font-head)` (Space Grotesk), `var(--font-body)` (Inter), `var(--font-mono)` (JetBrains Mono)
     * Radios: `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-lg)`
   * **Nunca usar colores hexadecimales hardcodeados** en componentes si existe un token equivalente.

2. **Compatibilidad Glassmorphism:**
   * Cada contenedor con `backdrop-filter: blur(...)` debe incluir su contraparte `-webkit-backdrop-filter: blur(...)` para soporte completo en Safari e iOS.

3. **Convención BEM / Nombres de Clases:**
   * Evitar selectores de clase genéricos que colisionen globalmente (ej: usar `.btn-nav-ghost` en navbar en lugar de `.btn-ghost` si tienen comportamientos distintos).

4. **Accesibilidad y Movimiento:**
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

