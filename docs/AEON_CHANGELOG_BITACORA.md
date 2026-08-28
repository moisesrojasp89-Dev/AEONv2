# 📖 AEON — Bitácora de Desarrollo, Refactorizaciones y Registro de Errores

Este documento contiene el registro cronológico y técnico de todas las actualizaciones, refactorizaciones, errores encontrados, malas prácticas eliminadas y lecciones aprendidas durante la construcción de la plataforma AEON.

---

## 🏛️ 1. Hitos de Arquitectura y Nuevas Generaciones

### A. Motor Autónomo de Alta Frecuencia (Local VPS Engine — `aeon_autonomous_engine.py`)
* **Propósito:** Reemplazar por completo los cron jobs lentos y limitados de GitHub Actions por un motor autónomo multi-módulo que corre localmente en segundo plano (costo \$0) o en un VPS dedicado.
* **Módulo de Mercados (14 Activos):**
  * Sincronización continua cada 20 segundos con cotizaciones reales en lote.
  * Ingesta de 12 activos mediante **1 sola petición batch a OANDA** (`XAU_USD,EUR_USD,USD_JPY,GBP_USD,USD_CAD,AUD_USD,NZD_USD,USD_CHF,SPX500_USD,NAS100_USD,US30_USD,JP225_USD`).
  * Ingesta de Bitcoin (BTC/USD) en **1 sola petición a la API pública de Binance**.
  * Cálculo matemático directo del DXY mediante fórmula geométrica ponderada ICE.
  * **Cero llamadas consumidas a TwelveData** (eliminación de riesgo de error `429 Too Many Requests`).
  * Cálculo determinista de dPOC, Session VWAP, variación 24h y soporte/resistencia S1/R1.
  * Upsert atómico en Supabase `public.market_intelligence` transmitido vía Realtime a todos los clientes web sin recargar.
* **Módulo de Calendario (Modo Sniper Event-Driven):**
  * Monitoreo continuo de eventos macroeconómicos de la jornada.
  * Al entrar en la ventana **$T-5\text{ min}$** previa a un evento de Alto/Medio impacto, activa sondeo de alta frecuencia (cada 15s) hasta detectar la publicación del dato real (`actual`), actualiza la base de datos y regresa al modo normal.
* **Módulo de Briefing & Noticias (Dinámica por Fases de Sesión):**
  * Detección automática de la sesión bursátil activa (**Asia-Pacífico / Tokio**, **Europa / Londres**, **América / Wall Street**).
  * Frecuencia adaptativa: cada 3 min en Pre-Apertura/Apertura; cada 10 min en sesión regular.
  * Síntesis macroeconómica ejecutiva contextualizada con IA (Gemini 2.5 Flash) y fallback determinista.

---

## 🎨 2. Refactorizaciones de Frontend y Experiencia de Usuario (UI/UX)

### A. Menú Lateral Minimalista Móvil (Estilo Drawer "Nexora")
* Sustitución completa de emojis del sistema por iconos vectoriales SVG limpios (`<svg>`).
* Agrupación por categorías en mayúsculas pequeñas (`PLATAFORMA`, `CUENTA`).
* Píldora activa con borde redondeado e iluminación cian AEON (`var(--accent-cyan)`).
* Inclusión de la tarjeta inferior institucional *AEON Pro Terminal*.
* Controlador autónomo en `src/js/navbar.js` con cierre automático en navegación y tecla `Escape`.

### B. Terminal de Mercados Móvil con Carrusel Horizontal Estricto
* Eliminación del scroll vertical infinito en móvil.
* Implementación de `#markets-grid` con `display: flex`, `flex-wrap: nowrap`, `overflow-x: auto` y `scroll-snap-type: x mandatory`.
* Tarjetas calibradas a `86vw` de ancho para navegación táctil fluida con el pulgar.
* Indicador visual de deslizamiento `👈 Desliza activos en vivo 👉` con iconos SVG animados.

### C. Calendario Económico y Filtros de Noticias
* Inclusión de snapshots locales en `src/data/economic_calendar_snapshot.json` y `src/data/market_intelligence_snapshot.json` como failover garantizado ante fallas de red.
* Corrección del selector de categorías de noticias (`Live Feed`, `Metales`, `Forex`, `Índices`, `Centrales`) para filtrar estrictamente y mostrar estado vacío si no hay coincidencias en lugar de recargar todas las noticias.

---

## 🐞 3. Registro de Errores Críticos (Bugs) y Malas Prácticas Resueltas

### Error 1: Fallos Consecutivos de Compilación en Vercel CI (`Module not found` & `Error`)
* **Síntoma:** Vercel cancelaba todos los despliegues con error rojo (`🔴 Error`) y seguía sirviendo una versión congelada de hacía 5 horas.
* **Causas Raíz:**
  1. **Regla general en `.gitignore`:** La línea `data/` en `.gitignore` sin barra inicial ignoraba también la carpeta `src/data/`. Los archivos JSON de respaldo no se subían a GitHub, y al compilar en Vercel (Linux), Vite fallaba con `Module not found: ../../data/economic_calendar_snapshot.json`.
  2. **Regex compleja en `vercel.json`:** La propiedad `headers[0].source` contenía `"/(.*\\.html|/|$)"`, una expresión regular con pipes y escapes que el parser de rutas de Vercel (*path-to-regexp*) no soporta, crasheando el proceso antes de compilar.
  3. **`vite` en `devDependencies`:** En entornos con `NODE_ENV=production`, los gestores de paquetes podan `devDependencies`, causando `vite: command not found`.
  4. **Desincronización de `package-lock.json`:** Ediciones manuales en `package.json` sin ejecutar `npm install` provocaban que `npm ci` en Vercel fallara por falta de sincronía.
* **Solución Implementada:**
  * Se corrigió `.gitignore` a `/data/` y `!src/data/`.
  * Se movieron los snapshots a `src/data/` y se incluyeron en Git.
  * Se reescribió `vercel.json` con patrones glob estándar oficiales (`/(.*)` y `/assets/(.*)`).
  * Se movió `vite` a `dependencies` y se sincronizó `package-lock.json`.

---

### Error 2: Bucle de Auto-Recargas de la Página en el Servidor Local
* **Síntoma:** En `http://192.168.1.8:5173/`, la página web parpadeaba y se recargaba sola cada 20 segundos.
* **Causa Raíz:** El motor de agentes en segundo plano (`aeon_autonomous_engine.py`) sobreescribía el archivo `data/market_intelligence_snapshot.json` en cada ciclo de 20s. El observador de archivos (*file-watcher*) de Vite detectaba el cambio en disco y disparaba una recarga completa del navegador (*Hot Reload*).
* **Solución Implementada:**
  * En `vite.config.js`, se configuró `server.watch.ignored: ['**/data/**', '**/scripts/**', '**/.git/**']`.
  * En el motor Python, se limitó la escritura a disco a un intervalo de 15 minutos junto con el snapshot de auditoría.

---

### Error 3: Riesgo de Agotamiento de Rate Limits en TwelveData (Error 429)
* **Síntoma / Riesgo:** El plan gratuito de TwelveData tiene un límite estricto de **8 peticiones/min y 800/día**. Consultar 14 activos individualmente cada 20s genera 42 llamadas por minuto, bloqueando la API en menos de 60 segundos.
* **Solución Implementada:**
  * Migración total de la ingesta a la **API por lotes de OANDA v20** (12 activos en 1 sola llamada HTTP) + **API pública de Binance** para BTC (1 llamada) + cálculo matemático del DXY.
  * Consumo de peticiones a TwelveData reducido a **cero (0)**.

---

### Error 4: Resaltado Múltiple Simultáneo en el Menú Lateral
* **Síntoma:** Al abrir el menú drawer en `index.html`, aparecían 3 píldoras azules iluminadas a la vez (`Radar & Briefing`, `Señales Institucionales` y `Academia & Macro`).
* **Causa Raíz:** En `navbar.js`, la condición `href.includes('index.html')` coincidía con todas las anclas de la página (`#briefing`, `#senales`, `#educacion`).
* **Solución Implementada:**
  * Se refactorizó la lógica para comparar la ruta exacta y el `window.location.hash` específico, garantizando que **solo una píldora esté activa a la vez**.

---

### Error 5: Conflicto de Sesiones Bursátiles en el Briefing
* **Síntoma:** Estando en la sesión asiática (Tokio), la tarjeta de briefing mostraba *"Sesión Europea / Londres"*.
* **Causa Raíz:** El objeto de respaldo `DEFAULT_BRIEFING` en `briefingService.js` tenía una plantilla antigua de Londres y la consulta no respetaba el orden estricto de `created_at desc`.
* **Solución Implementada:**
  * Se recalibró `DEFAULT_BRIEFING` para la sesión Asia-Pacífico activa (IPC Tokio 2.2%, Oro Spot \$4.582,85) y se configuró la detección dinámica de horarios en el motor orquestador.

---

### Error 6: Bloqueo de GitHub Push Protection por Claves Hardcodeadas
* **Síntoma:** GitHub rechazaba los `git push` con el error `GH013: Repository rule violations / Push cannot contain secrets`.
* **Causa Raíz:** Se incluyeron cadenas de respaldo literales de la clave de Supabase en archivos de scripts o servicios (`sb_secret_...`).
* **Solución Implementada:**
  * Eliminación absoluta de cualquier secret literal en el código fuente.
  * Lectura exclusiva mediante variables de entorno en `.env` (`SUPABASE_SERVICE_ROLE_KEY`, `OANDA_TOKEN`, etc.).

---

## 📋 4. Buenas Prácticas y Protocolos para Futuras Actualizaciones

1. **Gestión de Rutas y Snapshots:**
   * Cualquier archivo de datos consumido por el frontend mediante `import` DEBE residir dentro de `src/` (ej. `src/data/`) y estar rastreado en Git.
   * La carpeta `/data/` en la raíz se reserva exclusivamente para archivos temporales del backend/Python y debe permanecer en `.gitignore`.
2. **Despliegues en Vercel:**
   * Nunca usar expresiones regulares complejas con tuberías `|` o barras invertidas en `vercel.json`. Usar patrones glob oficiales `/(.*)`.
   * Mantener siempre `vite` en `dependencies` en `package.json` para evitar que `NODE_ENV=production` lo excluya.
   * Ejecutar `npm install` tras cualquier cambio en `package.json` antes de hacer commit.
3. **Optimización de Feeds Cuantitativos:**
   * Priorizar siempre endpoints por lotes (*batch endpoints*) y APIs públicas sin rate limit (como Binance) para mantener la frecuencia alta a costo \$0.
4. **Telemetría y Logs:**
   * Todos los daemons y motores deben incluir timestamps y emojis visuales (`✅`, `🎯`, `⚠️`, `❌`) para diagnóstico inmediato desde la consola.
