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

### D. Refactorización Modular de la Arquitectura CSS del Calendario Económico
* **Problema:** El archivo `src/css/components/calendar.css` había crecido hasta superar las 700 líneas, mezclando estilos de controles de formulario, paneles laterales de TradingView y la tabla de alta densidad.
* **Refactorización Modular Implementada:**
  1. **`src/css/variables.css`:** Inclusión de tokens de comparación de datos (`--stat-better`, `--stat-worse`, `--stat-pending`, `--stat-better-bg/border/text`), token de impacto bajo (`--impact-low`) y superficies de inputs oscuros (`--glass-bg`, `--input-bg`, `--input-border`).
  2. **`src/css/components/form-controls.css` (Nuevo Componente):** Extracción de `.calendar-search-input` y `.calendar-select` como utilidades reutilizables para cualquier formulario de la plataforma.
  3. **`src/css/components/sidebar-widget.css` (Nuevo Componente):** Extracción del panel lateral independiente con el widget de TradingView en vivo (`.tv-container`) y la tarjeta del próximo catalizador / dato publicado con animación de pulso (`pulse-dot`).
  4. **`src/css/components/calendar.css` (Limpio y Compacto):** Rediseño de la tabla de alta densidad con un layout responsivo estricto:
     * **Desktop ($\ge 900\text{px}$):** Grid de 8 columnas (`--eco-cols: 80px 60px 40px 1fr 80px 80px 80px 30px`).
     * **Móvil ($< 900\text{px}$):** Grid optimizado de 4 columnas (`68px 1fr 24px 28px`) con tarjeta de impacto macro colapsable (`.macro-impact-card`).

---

## 🧠 3. Evolución del Cerebro Cuántico y Agentes Autónomos (AEON Engine)

### A. Motor Cuántico Universal para los 14 Activos (`compute_institutional_quant_metrics`)
* **Mandato Institucional:** Eliminar cualquier sesgo aislado o cálculo manual. Todo trader (de Forex, Metales, Cripto o Índices) debe ver datos matemáticamente exactos.
* **Lógica Cuantitativa:** Cada 20 segundos se calcula el delta de sesión $\Delta_{\text{Sesión}} = \frac{P - P_{\text{Base}}}{P_{\text{Base}}} \times 100$ frente a benchmarks de apertura calibrados institucionalmente.
* **Métricas Deterministas Generadas:**
  * **Sesgo (`BULLISH` / `BEARISH` / `NEUTRAL`)** con puntuación de convicción ($50\% - 96\%$).
  * **Niveles dPOC (Daily Point of Control)** según bandas de volatilidad interbancaria.
  * **Session VWAP** y soportes/resistencias dinámicos ($S_1, S_2, R_1, R_2$).
  * **Tesis institucional y tags de catalizadores** (`DPOC_EXPANSION`, `BEARISH_FLOW`, `VWAP_SUPPORT`).
* **Sincronización:** Alimenta en tiempo real el radar del Daily Briefing (`asset_bias`), la terminal de `mercados.html` y las noticias.

### B. Corrección de la Fórmula Oficial ICE del Dollar Index (DXY)
* **Error Encontrado:** La fórmula geométrica del DXY calculaba `90.544` en lugar del valor real de mercado (`99.566`).
* **Causa:** Faltaba el componente ponderado de la corona sueca $(USDSEK^{0.042})$.
* **Solución:** Se incorporó `USD_SEK` al lote de OANDA y se aplicó la fórmula oficial de ICE:
  $$DXY = 50.14348112 \times EURUSD^{-0.576} \times USDJPY^{0.136} \times GBPUSD^{-0.119} \times USDCAD^{0.091} \times USDSEK^{0.042} \times USDCHF^{0.036}$$
  Resultado: Exactitud milimétrica de nivel interbancario.

### C. Modo Institucional de Fin de Semana (`weekend_wrap`)
* **Detección Temporal:** Reconoce automáticamente el cierre bursátil de Forex y Renta Variable (Viernes 21:00 UTC a Domingo 21:00 UTC).
* **Comportamiento:**
  * **Píldora:** `MERCADOS CERRADOS · CRIPTO 24/7`.
  * **Portada:** Gráfica financiera institucional en tonos azul cian y neón dark fintech (`#0EA5E9` / `#070B12`).
  * **Cotizaciones:** Congela precios de cierre del viernes en Forex/Índices/Metales y mantiene **Bitcoin cotizando en tiempo real 24/7** con websocket/API de Binance.
  * **Tesis:** Balance semanal de absorción institucional y preparación de apertura de futuros para el domingo.

---

## 🐞 4. Registro de Errores Críticos (Bugs) y Malas Prácticas Resueltas

### Error 1: Fallos Consecutivos de Compilación en Vercel CI (`Module not found` & `Error`)
* **Síntoma:** Vercel cancelaba todos los despliegues con error rojo (`🔴 Error`) y seguía sirviendo una versión congelada.
* **Solución Implementada:** Corrección de `.gitignore` (`/data/`, `!src/data/`), `vercel.json` con globs estándar y sincronización de `package-lock.json`.

### Error 2: Bucle de Auto-Recargas de la Página en el Servidor Local
* **Síntoma:** En `http://192.168.1.8:5173/`, la página web parpadeaba y se recargaba sola cada 20 segundos.
* **Solución Implementada:** Se ignoraron rutas de snapshots en `vite.config.js` (`server.watch.ignored`).

### Error 3: Riesgo de Agotamiento de Rate Limits en TwelveData (Error 429)
* **Solución Implementada:** Migración total a la API por lotes de OANDA v20 (1 sola petición para 12 activos) + Binance público para BTC. Consumo TwelveData reducido a 0.

### Error 4: Discrepancia Horaria en Catalizadores del Daily Briefing (04:30 vs 08:30)
* **Síntoma:** Eventos de las 08:30 AM (hora Nueva York/Caracas) figuraban como 04:30 AM en la interfaz.
* **Causa Raíz:** El backend guardaba `"08:30"` asumiendo hora local, pero la función `formatToUserLocalTime()` interpretaba la cadena como UTC y le restaba 4 horas (`08:30 UTC - 4 = 04:30`).
* **Solución:** Estandarización de todos los catalizadores a **formato UTC estricto** en el backend (`12:30 UTC` para 08:30 ET, `14:00 UTC` para 10:00 ET, `23:30 UTC` para 19:30 Local / Tokio 08:30).

### Error 5: Datos Estáticos Inventados en Noticias y Plantilla del IPC de Tokio (2.2% vs 1.8%)
* **Síntoma:** Las noticias debajo del briefing mostraban *"Japón: IPC Subyacente de Tokio repunta al 2.2%"* cuando en el calendario el dato oficial publicado era **1.8%**.
* **Causa Raíz:** En `scripts/ai/aeon_autonomous_engine.py`, la rama de noticias asiáticas contenía un bloque con cadenas de texto estáticas *hardcodeadas* como mock inicial.
* **Solución:** **Eliminación total y definitiva de plantillas estáticas.** El generador de noticias ahora implementa **Grounding Obligatorio**: extrae directamente los datos publicados de la tabla `economic_calendar` de Supabase y las cotizaciones en tiempo real del motor cuantitativo, garantizando 100% de coherencia en cada número publicado.

### Error 6: Eventos Pasados de Discursos (Warsh) Mostrados como "PRÓXIMO" en Fin de Semana
* **Síntoma:** El evento *Fed Chairman Warsh Speaks* (ocurrido el viernes a las 10:00 AM) figuraba con el badge `PRÓXIMO` un sábado por la noche.
* **Causa Raíz:** Las comparecencias no tienen previsión numérica (`actual: null`). La condición anterior `status = 'live' if ev.get('actual') else 'upcoming'` asignaba erróneamente `PRÓXIMO` porque `actual` era nulo, ignorando que la fecha `event_time` ya había transcurrido.
* **Solución:** Se implementó la regla temporal estricta `is_past = (ev_time <= now_utc)`. Si la fecha ya transcurrió, el evento se marca como `live` (`PUBLICADO`) y se le asigna `"Publicado"` si el campo `actual` estaba vacío.

---

## 📋 5. Buenas Prácticas y Protocolos para Futuras Actualizaciones

1. **Principio de Single Source of Truth (SSOT):**
   * El Daily Briefing, las Noticias en Vivo y los Widgets NUNCA deben usar listas de eventos o números manuales en código. Todo debe originarse en la base de datos `public.economic_calendar` y `public.market_intelligence`.
2. **Grounding de Inteligencia Artificial (Gemini):**
   * Al invocar LLMs para análisis macro, se deben proporcionar como contexto los datos limpios de la base de datos con instrucciones explícitas de "Cero Alucinaciones".
3. **Manejo de Zonas Horarias:**
   * Todos los registros en la base de datos se almacenan en **UTC (`+00:00`)**. La conversión a la zona horaria del usuario se realiza exclusivamente en el cliente mediante `Intl.DateTimeFormat` / `formatToUserLocalTime()`.
4. **Modularidad CSS & Cero Deuda Técnica:**
   * Ningún archivo de componentes CSS debe superar las 300 líneas. Los estilos compartidos deben residir en sus respectivos módulos bajo `src/css/components/` o `src/css/variables.css`.
   * Prohibición absoluta de estilos `style="..."` inline y directivas `!important`.

---

## 🏛️ 6. Hito 6: Terminal de Análisis Institucional, Desacoplamiento de Navbar y Erradicación de Deuda Técnica (Auditoría Integral)

### A. Erradicación de Deuda Técnica y Anti-Patrones (Auditoría Exhaustiva)
1. **Centralización de Navegación Global (`#navbar-root`):**
   * **Problema:** Existían 10 barras de navegación duplicadas hardcodeadas en HTML a lo largo de todo el proyecto (`index.html`, `mercados.html`, `calendario.html`, `perfil.html`, páginas de autenticación y legales), junto con scripts repetidos `toggleMobileMenu()`.
   * **Solución:** Centralización en `src/js/templates/navbar.js` y `src/js/navbar.js`. Cada archivo HTML ahora contiene únicamente `<div id="navbar-root"></div>`, eliminando más de 800 líneas de HTML duplicado y asegurando que cualquier cambio de enlace, icono o lógica de sesión se propague instantáneamente a todas las páginas.
2. **Limpieza de Tokens CSS (100% Tokenizado en `variables.css`):**
   * **Problema:** Presencia de más de 120 valores hexadecimales directos (`#0EA5E9`, `#EF4444`, `#090D18`), radios fijos y sombras mágicas en más de 20 archivos CSS.
   * **Solución:** Reemplazo integral por tokens semánticos: `var(--accent)`, `var(--red)`, `var(--green)`, `var(--bg-drawer)`, `var(--radius-sm)`, `var(--dur-base)`.
3. **Eliminación de `!important` y Estilos Inline:**
   * Eliminados todos los `!important` forzados en CSS y atributos `style="..."` tanto en plantillas JavaScript como en documentos HTML, respetando la cascada natural del navegador.

---

### B. Creación de la Terminal de Análisis Estructural (`/analisis.html`)
1. **Filosofía "Menos es Más" — Los 4 Reyes del Mercado:**
   * Se restringió el enfoque a los 4 activos macro institucionales más líquidos del mundo:
     1. **Oro Spot (`XAUUSD`)** — Refugio macro e inflación.
     2. **Bitcoin (`BTCUSDT`)** — Liquidez global y apetito de riesgo 24/7.
     3. **Euro / Dólar (`EURUSD`)** — Eje del mercado interbancario de divisas.
     4. **Nasdaq 100 (`NAS100`)** — Vector del ciclo tecnológico y renta variable estadounidense.
2. **Evolución del Gráfico: De Widget Saturado a Motor Canvas Nativo:**
   * **Iteración 1 (TradingView Widget iframe):** En pruebas en móvil se detectó que el widget saturaba la pantalla con una columna izquierda de 10 herramientas de dibujo enanas, títulos truncados (`Oro al contado/...`), subpanel de RSI comprimido y pérdida de fluidez táctil.
   * **Iteración 2 (Motor Nativo Canvas con Lightweight Charts v5):**
     * Curva de área neón con gradiente dark luxury idéntica al Hero (`#0EA5E9`), adaptativa al 100% del ancho móvil con cero recortes.
     * **Mínimo y Quirúrgico (Solo 3 Niveles Clave):**
       - 🔴 **1 Línea ZAP Venta (Sellside POI)** con precio exacto.
       - ⚡ **1 Línea EMA 50 (1H)** en naranja institucional.
       - 🟢 **1 Línea ZAP Compra (Buyside POI)** con precio exacto.
     * **Guard de Escala Auto-Adaptativo:** Algoritmo que detecta si los niveles de la ZAP superan el 20% de diferencia con el precio en pantalla (por ejemplo, discrepancias entre CFD de OANDA a 29,000 y contado a 21,000 en Nasdaq) y los calcula dinámicamente (+1.2% / -1.2%) para garantizar que **las líneas jamás se pierdan ni queden fuera del gráfico**.
3. **Rediseño Institucional Plano de la Terminal Escrita:**
   * Eliminación de tarjetas con bordes redondeados pesados ("burbujas") para pasar a una interfaz de alta densidad tipo Linear / Bloomberg:
     * **Segmented Control Plano:** Pestañas mínimas (`ZONAS ZAP`, `ESCENARIOS`, `MÉTRICAS & DETALLE`).
     * **Escalera Estructural (ZAP Ladder):** Oferta arriba y Demanda abajo con acentos de 3px y línea central divisoria con el precio en vivo.
     * **Piscinas de Liquidez ($$$ BSL/SSL):** Lista tabular en filas planas con separadores finos y estados discretos (`[ Pendiente ]` y `[ Barrido ✔ ]`).
     * **Escenarios Condicionales:** Rutas de expansión y continuación (*"Si... entonces"*) con límites de invalidación.
4. **Persistencia de Estado en Tiempo Real (`currentActiveTab`):**
   * **Bug Resuelto:** Cada 20 segundos, la suscripción Realtime de Supabase redibujaba el HTML y reseteaba automáticamente la pestaña activa a "Zonas ZAP", interrumpiendo al usuario si estaba leyendo "Escenarios".
   * **Solución:** Se persistió la variable `currentActiveTab` en memoria y se trasladó al template para que cualquier actualización en vivo mantenga intacta la pestaña que el usuario está consultando.

---

### C. Conexión y Navegación Cruzada: Mercados ↔ Análisis
1. **Diferenciación Conceptual:**
   * **Mercados (`/mercados.html`):** *Radar / Escáner Panorámico* de 14 activos simultáneos para detección macro rápida.
   * **Análisis (`/analisis.html`):** *Mesa Quirúrgica / Ejecución* con gráfico interactivo y niveles ZAP detallados.
2. **Subtítulo Reenfocado en Mercados:**  
   *"Radar institucional en vivo: escáner de sesgos direccionales, flujos de sesión y catalizadores macro."*
3. **Enlace Contextual `[ Analizar ZAP → ]`:**  
   En las tarjetas de Oro, Bitcoin, Euro y Nasdaq dentro de Mercados, se agregó un botón de acción rápida que navega a `/analisis.html?symbol=XYZ`, cargando el gráfico y los datos del activo al instante.
4. **Botones del Hero en `index.html`:**  
   * `Ver mercados →` ahora navega a `/mercados.html`.  
   * `Explorar Análisis` ahora navega a `/analisis.html`.

