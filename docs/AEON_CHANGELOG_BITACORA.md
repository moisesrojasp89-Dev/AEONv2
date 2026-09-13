# 📖 AEON — Bitácora de Desarrollo, Refactorizaciones y Registro de Errores

Este documento contiene el registro cronológico y técnico de todas las actualizaciones, refactorizaciones, errores encontrados, malas prácticas eliminadas y lecciones aprendidas durante la construcción de la plataforma AEON.

---

## 🏛️ 1. Hitos de Arquitectura y Nuevas Generaciones

### A. Motor Autónomo de Alta Frecuencia (Local VPS Engine — `aeon_autonomous_engine.py`)
* **Propósito:** Reemplazar por completo los cron jobs lentos y limitados de GitHub Actions por un motor autónomo multi-módulo que corre localmente en segundo plano (costo \$0) o en un VPS dedicado.
* **Módulo de Mercados (17 Activos Globales):**
  * Sincronización continua cada 20 segundos con cotizaciones reales en lote.
  * Ingesta de 14 activos mediante **1 sola petición batch a OANDA** (`XAU_USD,XAG_USD,EUR_USD,USD_JPY,GBP_USD,USD_CAD,AUD_USD,NZD_USD,USD_CHF,USD_SEK,WTICO_USD,SPX500_USD,NAS100_USD,US30_USD,JP225_USD`).
  * Inclusión de **Plata Spot (XAG/USD)** en Metales y **Petróleo Crudo WTI (USOIL / WTICO)** en Energía.
  * Ingesta dual de Criptoactivos: **Bitcoin (BTC/USD)** y **Ethereum (ETH/USD)** mediante APIs públicas de Binance y Coinbase.
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

### B. Reorientación Institucional MAS v1.1.0: Terminal de Contexto Cuantitativo & Guardrails Anti-Oráculo (13 Septiembre 2026)
* **Erradicación del Paradigma de "Señales":**
  * Abandono definitivo del modelo de alertas de compra/venta y de la palabra "señal".
  * Consolidación de AEON como una **Terminal de Inteligencia Cuantitativa y Contexto Estructural**. Cero "ideas de negocio", cero incitaciones a operar.
* **Cancelación Estratégica de Fase 4 (MT5 / Brokers / TradingView Externo):**
  * Tras auditoría externa con Claude, se descartó la conexión a MT5 y prop-firms para blindar el producto contra riesgos de deslizamiento, fallas de sockets IPC y restricciones contractuales de prop-firms.
  * Se descartó la exportación de scripts independientes a TradingView para proteger el activo soberano (la web propia) y evitar canibalización y piratería.
* **Desacoplamiento Estructural en Dos Capas (`aeon-copilot-event/index.ts`):**
  * **Capa 1 (Gate de Emisión):** Disparo por magnitud intrínseca de microestructura (`microScore >= 25`: interacción ZAP, barrido de liquidez BSL/SSL y desequilibrio vs dPOC). Se eliminó la censura de eventos por falta de confirmación en DXY.
  * **Capa 2 (Insumo Narrativo):** DXY, US10Y, sesgo de sesión y calendario económico pasan a ser insumo contextual para el Agente 2.
* **4 Candados Deterministas Anti-Oráculo:**
  * **Enum cerrado en `responseSchema`:** `event_type` restringido a valores predefinidos (`BARRIDO_LIQUIDEZ_SSL`, `TEST_ZAP_DEMANDA`, etc.).
  * **Invalidación técnica precalculada:** Fórmula determinista con spread buffers reales (50¢ oro, 3 pips FX/JPY).
  * **Reloj macro determinista:** Inyección en código de `calendar_status: "past" | "upcoming"` para evitar alucinaciones temporales del modelo.
  * **Filtro denylist regex post-generación:** Bloqueo automático de cualquier consejo imperativo (`compra/vende/aprovecha/entra`), conmutando a fallback determinista neutral.
* **Copilot Consultivo de Auditoría de Escenarios (`aeon-chat/index.ts`):**
  * Formato exacto de auditoría con datos crudos: Entrada, SL óptimo fuera de zonas de barrido, TP de liquidez, ratio R:R crudo y advertencia de microestructura (RSI, short squeeze).
  * Manejo determinista de caso borde: `Estructura ya invalidada en ese precio` si el precio propuesto cruzó el SL estructural.
* **Validación & Batería de Regresión:**
  * Nueva suite en `tests/test_mas_anti_oracle_and_context.py` (5/5 pruebas OK).
  * Suite completa: 18/18 pruebas pasando en 0.009s.
  * Build de producción Vite en 493ms con 0 errores.

---

## 🎨 2. Refactorizaciones de Frontend y Experiencia de Usuario (UI/UX)

### A. Menú Lateral Minimalista Móvil (Estilo Drawer "Nexora")
* Sustitución completa de emojis del sistema por iconos vectoriales SVG limpios (`<svg>`).
* Agrupación por categorías en mayúsculas pequeñas (`PLATAFORMA`, `CUENTA`).
* Píldora activa con borde redondeado e iluminación cian AEON (`var(--accent-cyan)`).
* Inclusión de la tarjeta inferior institucional *AEON Pro Terminal*.
* Controlador autónomo en `src/js/navbar.js` con cierre automático en navegación y tecla `Escape`.

### B. Terminal de Mercados: Expansión a 17 Activos y Badges Vectoriales
* Incorporación de **Plata (XAG/USD)** con badge de plata metalizada (`AG`) y precisión de 3 decimales.
* Incorporación de **Petróleo WTI (USOIL)** con badge institucional de energía y filtro dedicado `🛢️ Energía (1)`.
* Incorporación de **Ethereum (ETH/USD)** con badge vectorial facetado índigo (`Ξ`) y filtro ampliado `₿ Cripto (2)`.
* Actualización dinámica del contador a `17 Activos en Vivo` y filtros por sector: Índices (4), Metales (2), Energía (1), Cripto (2), Divisas & DXY (8).
* Acción contextual `[ Auditar con IA ✦ ]` que transfiere el activo y sus niveles directamente al Copilot institucional en el chat flotante.

### C. Tema Global Obsidian Dark OLED (`#06090E`) & Cero FOUC
* 100% tokenizado en `variables.css` (`--bg: #06090E`, `--bg-deep: #04060A`, `--bg-drawer: #080C14`).
* Estilo crítico inline en `<head>` (`fadeIn` en 0.05s) para erradicar cualquier parpadeo de HTML sin estilos al refrescar.
* Header de cristal calibrado a `rgba(6, 9, 14, 0.75)` con desenfoque de 16px.

### D. Pasarela de Pagos Binance Pay & Notificaciones Push a Telegram
* Checkout modal en 3 pasos con validación de TxID e instrucciones directas con QR oficial sin recargar.
* Notificación push instantánea a Telegram mediante webhook/pg_net en base de datos al enviar el pago (cero esfuerzo para el usuario).
* Panel de administración `admin-pagos.html` para aprobación rápida y activación inmediata de suscripción Pro en un clic.

### E. Calendario Económico y Filtros de Noticias
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

### Error 7: Bloqueo de Actualización del Briefing por Conflicto HTTP 409 y Catalizadores Cruzados (Europeos en Sesión Americana)
* **Síntoma:** Estando en plena Sesión Americana (Wall Street & Fed), la tarjeta del Daily Briefing mostraba catalizadores de la sesión europea y asiática (AUD RBA Rate, EUR PMI, GBP PMI) y no los datos clave de EE.UU. publicados hoy (ISM PMI, JOLTS, Precios ISM).
* **Causas Raíz:**
  1. **Fallo de Upsert (HTTP 409 Conflict):** La tabla `public.daily_briefings` tiene una restricción de unicidad estricta `unique_daily_session` sobre `(date, session_id)`. El script `aeon_autonomous_engine.py` realizaba peticiones con `?on_conflict=id` inyectando un UUID fijo (`fe02dfe6-...`). Como en la base de datos ya existía un registro para `(2026-09-01, ny_pre)` creado previamente con otro UUID, PostgreSQL rechazaba el insert con error `23505 duplicate key value violates unique constraint "unique_daily_session"`, dejando el motor en bucle arrojando silenciosamente `HTTP Error 409: Conflict` e impidiendo que el briefing se sobreescribiera con los datos frescos.
  2. **Ponderación Descalibrada de Catalizadores:** En la función `get_session_dynamic_catalysts`, la coincidencia de divisa solo otorgaba `+50` puntos, permitiendo que eventos de alto impacto de Europa ocurridos más temprano superaran a los eventos de EE.UU. del mismo día.
* **Solución Implementada:**
  1. **Corrección de Upsert en REST API:** Se cambió el endpoint a `?on_conflict=date,session_id` y se retiró el UUID hardcodeado, permitiendo que PostgreSQL actualice (`UPDATE / merge-duplicates`) limpiamente la fila de la sesión activa del día.
  2. **Ponderación Absoluta por Sesión y Fecha:**
     * Mismo día (`ev_time.date() == now_utc.date()`): `+1000` puntos.
     * Divisa objetivo de la sesión (`USD/CAD` en NY, `EUR/GBP` en Londres, `JPY/AUD` en Asia): `+500` puntos.
     * Impacto: HIGH `+300`, MEDIUM `+150`.
     * Resultado: Durante la Sesión Americana, los eventos de EE.UU. de hoy (ISM Manufacturing PMI 54.6, JOLTS 7.27M, ISM Prices 71.1) tienen prioridad matemática total frente a cualquier dato de otra región.

### Error 8: Desfase Temporal Trans-Medianoche UTC en Sesión Asiática y Saneamiento Integral del Generador de Noticias
* **Síntomas:**
  1. Al abrir la Sesión Asia-Pacífico (21:00 UTC), el briefing mostraba una mezcla anacrónica de catalizadores pasados (AUD de hacía 17h, USD de hacía 7h y GBP de hacía 13h) en lugar de los catalizadores clave programados para la sesión asiática activa (PIB de Australia y Decisión de Tasas de Nueva Zelanda RBNZ).
  2. En la tesis de respaldo matemático, figuraba un soporte de Oro en \$4,480 mientras el precio cotizaba en \$4,328 (nivel incoherente superior al precio de mercado).
  3. En la sección de noticias, la noticia macro mostraba la frase rota `"USD: Datos de Empleo e Inflación se sitúa en Publicado"`, y la noticia de Bitcoin decía `"absorbe la liquidez del fin de semana"` un martes.
* **Causas Raíz:**
  1. **Desfase UTC Trans-Medianoche:** La sesión asiática inicia a las 21:00 UTC del día $D$ y transcurre hasta las 07:00 UTC del día $D+1$. La comprobación simple `ev_time.date() == now_utc.date()` penalizaba con 0 puntos a los eventos de la madrugada asiática porque ya pertenecían al día siguiente en tiempo universal, dando victoria errónea a eventos viejos del día anterior.
  2. **Nivel Hardcodeado en Fallback:** La plantilla de la tesis incluía literalmente `"hacia soportes en $4,480"`.
  3. **Filtro Invertido de Noticias:** El generador de noticias consultaba `order=event_time.desc&limit=10`, trayendo eventos del futuro lejano con campos `actual: null`, forzando el fallback que contenía el texto `"se sitúa en Publicado"`.
* **Soluciones Implementadas:**
  1. **Ventana Temporal Relativa de Sesión:** Se implementó una ventana adaptativa de `[-3h, +12h]` respecto al reloj UTC actual, con filtrado estricto por las divisas de la sesión activa (`target_currencies: ['JPY', 'AUD', 'NZD', 'CNY']`). Para la sesión asiática, esto posicionó de inmediato al PIB de Australia y a la Decisión de Tasas de Nueva Zelanda (+4h) en el podio.
  2. **Cálculo Cuantitativo Dinámico de Soportes:** Se reemplazaron los valores rígidos por proyecciones matemáticas vivas basadas en la cotización real: `gold_supp = round(gold_price * 0.992, 2)` y `gold_res = round(gold_price * 1.008, 2)`.
  3. **Reescritura del Generador de Noticias:** Ingesta de eventos recién publicados con `event_time=lte.NOW`, redacción periodística institucional con comparativa real vs esperado, y control de día de semana para cripto (`is_weekend = weekday in (5, 6)`).
  4. **Paginación Defensiva en Frontend:** En `src/js/services/newsService.js` se añadió `.limit(20)` para prevenir descargas masivas de registros.

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

---

## 🏛️ 7. Hito 7: Auditoría Forense y Reingeniería del Motor de Briefing y Noticias (`aeon_autonomous_engine.py`)

### A. Diagnóstico de Causas Raíz en Producción
1. **Agotamiento de Cuotas en Modelos LLM:**
   * Al invocar modelos pesados en bucles cortos, la cuota gratuita de la API de Gemini se saturaba con errores HTTP 429 (`RESOURCE_EXHAUSTED`).
2. **Generación de Noticias Duplicadas e Idénticas:**
   * En cierres de mercado (ej. viernes por la tarde), el generador de noticias producía réplicas exactas cada pocos minutos, saturando la base de datos con titulares repetidos.
3. **Salto Prematuro de Catalizadores Macro (Bug del Fin de Semana):**
   * El algoritmo de selección de eventos descartaba los datos del viernes por la tarde (`diff_hours < 0`) e inflaba eventos distantes del jueves siguiente (como el IPC de EE.UU.) con 17,500 puntos por su etiqueta Tier-1A. Esto hacía que el viernes por la noche la terminal mostrara eventos a 6 días vista, ignorando por completo el balance semanal y los datos clave de lunes a miércoles.
4. **Falta de Diversificación Multiactivo por Categoría:**
   * En la sección de Noticias, la categoría "Metales" solo mostraba Oro (omitiendo Plata), "Índices" solo cubría S&P 500 (omitiendo Nasdaq y Dow Jones), y "Live Feed" duplicaba la lista completa en lugar de aislar los eventos de alto impacto (*Breaking News*).

### B. Solución Arquitectónica Implementada
1. **Migración Unificada a `gemini-3.1-flash-lite`:**
   * Tiempos de respuesta ultrarrápidos (400–800ms) y consumo mínimo de tokens con cero llamadas a TwelveData (100% OANDA batch + Binance directo).
2. **Deduplicación Algorítmica con Hashing MD5:**
   * Generación de huella digital única (`headline_hash = md5(title + date)`) antes del guardado en Supabase, con limpieza atómica que erradica duplicados.
3. **Lógica Bifurcada: Modo `weekend_wrap` y Horizontes Escalonados:**
   * **Franja Fin de Semana (Vie 17:00 NY a Dom 17:00 NY):** El motor entra en `weekend_wrap` y genera una síntesis de balance semanal digiriendo los datos macro de cierre (NFP, Desempleo, Salarios) con sus valores reales publicados (`actual: 162K`, `4.1%`, `0.3%`) y marcados como `digested`.
   * **Apertura de Asia & Sesiones Semanales (Dom 17:00 NY en adelante):** Se activa la **Ventana de Inmediatez Estricta** en 3 horizontes cronológicos no saltables:
     - *Horizonte 1 (0h a 36h):* Eventos inmediatos de lunes y martes (China, Japón, Europa).
     - *Horizonte 2 (36h a 72h):* Miércoles.
     - *Horizonte 3 (72h a 120h):* Jueves y viernes.
4. **Expansión Multiactivo y Filtrado en Live Feed:**
   * Cobertura explícita de Oro (`XAUUSD`) y Plata (`XAGUSD`); Nasdaq (`NAS100`), Dow Jones (`US30`) y S&P 500 (`SPX500`); Petróleo WTI (`USOIL`); y divisas macro clave (JPY, EUR, GBP, USD).
   * La pestaña "Live Feed" ahora filtra estrictamente noticias destacadas (`is_breaking = true`), mientras que las categorías organizan el flujo sectorial.

---

## 🎨 8. Hito 8: Rediseño Visual del Hero y Optimización Responsive de Grids

### A. Renovación Visual Institucional
1. **Asset Gráfico de Alta Fidelidad (`hero-preview.webp`):**
   * Reemplazo de imágenes genéricas por una captura estilizada de la terminal financiera con iluminación dark luxury, adaptada al branding Linear/Bloomberg de AEON.
   * Optimización de peso en formato WebP para tiempos de carga inferiores a 200ms.
2. **Resolución de Colapso en Grid de Noticias Destacadas (`news.css` & `news.js`):**
   * **Problema:** En ciertas resoluciones de escritorio, las tarjetas destacadas del feed colapsaban horizontalmente, aplastando los titulares y metadatos.
   * **Solución:** Reestructuración de la cuadrícula CSS con `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))` y contención rígida de overflow, garantizando legibilidad perfecta tanto en monitores Ultra-Wide como en tablets y smartphones.

---

## ⚡ 9. Hito 9: Auditoría Forense y Conexión Cuántica en Vivo de `/analisis.html`

### A. Diagnóstico de Causas Raíz del Congelamiento
* **Causa 1 (Falta de Columnas DDL):** La tabla `public.market_intelligence` carecía de columnas para `structural_poi`, `liquidity_pools` y `session_levels`.
* **Causa 2 (Omisión en Backend):** `aeon_autonomous_engine.py` solo actualizaba precios de mercados, sin generar niveles ZAP ni escenarios condicionales.
* **Causa 3 (Discrepancia de Símbolo):** Frontend consultaba `BTCUSDT` mientras la base de datos indexaba `BTCUSD`, provocando respuesta `null` y congelamiento permanente de Bitcoin en `$77,881.32`.
* **Causa 4 (Fallback Permanente):** Al faltar datos en la respuesta, `analysisService.js` caía siempre en el archivo estático inicial.

### B. Solución Arquitectónica Implementada (Zero-DDL)
1. **Aprovechamiento de `cited_key_levels JSONB`:**
   * Sin alterar el esquema de base de datos ni requerir migraciones complejas, se inyecta el payload estructural completo (`session_levels`, `structural_poi`, `liquidity_pools`, `structural_scenarios`, `diagnosis`) dentro de `cited_key_levels`.
2. **Motor Cuantitativo Dinámico ([`compute_structural_analysis`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/ai/aeon_autonomous_engine.py)):**
   * Para los 4 reyes (`XAUUSD`, `BTCUSD`, `EURUSD`, `NAS100`), recalcula cada 20 segundos las zonas ZAP (Oferta/Demanda 1H), piscinas BSL/SSL con estado `swept` vs `unmitigated` y escenarios *"SI... ENTONCES"* con niveles reales de invalidación.
3. **Mapeo Transparente en Frontend ([`analysisService.js`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/js/services/analysisService.js)):**
   * Normalización bidireccional `BTCUSDT` <-> `BTCUSD` y desempaquetado reactivo de `cited_key_levels`.
4. **Heartbeat Polling de Seguridad ([`analysis.js`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/js/analysis.js)):**
   * Incorporación de un sondeo pasivo cada 25 segundos como respaldo del canal WebSocket de Supabase, asegurando que si un navegador móvil entra en reposo o se interrumpe la conexión, la terminal nunca quede congelada.
5. **Formateo Numérico de Alta Precisión ([`analysisCard.js`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/js/templates/analysisCard.js)):**
   * Resolución de redondeos en Forex (`EURUSD` a 4 decimales exactos: `1.1614`) eliminando símbolos `$` inapropiados en pares de divisas.

---

## 🤖 10. Hito 10: Asistente y Copiloto IA Institucional (AEON Copilot)

### A. Arquitectura Server-Side (Edge Function: `aeon-chat`)
* **Ubicación:** `supabase/functions/aeon-chat/index.ts`
* **Blindajes de Seguridad Institucional:**
  1. **Autenticación Zero-Trust:** El `user_id` se extrae estrictamente de `auth.getUser(token)` verificado en servidor, nunca del cuerpo de la petición.
  2. **Validación de Tier (Fail Fast):** Verificación server-side en `public.profiles` (`tier in ('pro', 'institutional')`) y `public.subscriptions` antes de consumir cómputo de IA.
  3. **Freshness Check Estricto:** Monitoreo con `Math.min()` de los timestamps de todos los activos en `public.market_intelligence`; si los datos superan los 8 minutos de antigüedad, la función advierte o fuerza actualización.
  4. **Structured Output (Gemini Schema):** Inferencia obligada a un esquema JSON cerrado con categorías financieras explícitas (`MACRO`, `TECNICO_ORDERFLOW`, `CATALIZADOR`, `GESTION_RIESGO`).
  5. **Escudo Anti-Jailbreak (`STANDARD_REFUSAL`):** Cualquier consulta no financiera, intento de manipulación de instrucciones o inyección de prompt activa un rechazo canónico seguro.
  6. **Historial Sanitizado:** Estructura alternada estricta (`user` -> `assistant`) comenzando siempre con el mensaje del usuario.

### B. Widget de Usuario en Frontend (`chatWidget.js` & `chat.css`)
* **Ubicación:** `src/js/components/chatWidget.js` y `src/css/components/chat.css`.
* **Integración Global:** Invocado automáticamente por la Navbar unificada ([`src/js/navbar.js`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/js/navbar.js)) mediante el botón flotante institucional (`.aeon-chat-fab`).
* **Experiencia de Usuario Multiestado:**
  - **Guest:** Banner explicativo que invita a iniciar sesión para interactuar con la inteligencia macro.
  - **Free:** Modal interactivo con comparativa de beneficios y botón de actualización a Pro.
  - **Pro / Institucional:** Acceso completo al Copiloto con indicador de cuota diaria (50 consultas/día), historial local persistente (`localStorage`), sanitización XSS y renderizado estructurado de confluencias de mercado.

---

## 💎 11. Hito 11: Auditoría CSS Exhaustiva & Tokenización Integral 100%
* **Propósito:** Erradicar deuda técnica oculta, inconsistencias de estilo y valores fijos en las hojas de estilo del proyecto.
* **Acciones Ejecutadas:**
  1. **Tokenización de Diseño (`src/css/variables.css`):** Creación de tokens canónicos para la paleta neutral (`--slate-500`, `--slate-400`, `--slate-200`, `--slate-50`), estados de botones (`--accent-dim`, `--accent-border`, `--accent-glow`), y capas (`--z-behind: -1`, `--z-base: 1`, `--z-above: 2`, `--z-sticky: 10`, `--z-nav: 900`, `--z-overlay: 998`, `--z-drawer: 999`, `--z-modal: 1000`).
  2. **Erradicación de Hexadecimales Hardcodeados:** Reemplazo de más de 80 instancias de colores hexadecimales fijos en `components/news.css`, `signals.css`, `navbar.css`, `perfil.css`, `auth.css` y `form-controls.css`.
  3. **Eliminación de `!important`:** Eliminación del 100% de declaraciones `!important` en el código fuente, restaurando la cascada natural y la especificidad CSS predecible.
  4. **Estandarización de Radios y Transiciones:** Uso consistente de `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-pill`, `--dur-fast`, `--dur-base` y `--ease-spring`.

---

## 🏛️ 12. Hito 12: Desacoplamiento y Unificación de Navbar Centralizada
* **Problema Previo:** La barra de navegación y el cajón móvil (`aside.mobile-drawer`) se encontraban duplicados en 11 archivos HTML distintos, acumulando más de 1.500 líneas de código redundante y provocando inconsistencias en el estado de autenticación de los usuarios.
* **Solución Arquitectónica:**
  1. **Inyección Dinámica Centralizada:** Sustitución de los bloques `<header>` y `<aside>` duplicados por un único punto de anclaje `<div id="navbar-root"></div>` en las 11 páginas (`index.html`, `mercados.html`, `calendario.html`, `perfil.html`, `login.html`, `registro.html`, `recuperar.html`, `actualizar-password.html`, `aviso-legal.html`, `privacidad.html`, `cookies.html`).
  2. **Plantilla Única en [`src/js/templates/navbar.js`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/js/templates/navbar.js):** Renderizado reactivo que detecta la página actual, resalta la pestaña activa con accesibilidad `aria-current="page"` y gestiona las vistas de visitante (*Guest*) vs usuario autenticado (*User View*).
  3. **Integración Global de AEON Copilot:** Inicialización automática del asistente inteligente flotante en todo el ecosistema de la plataforma.

---

## 👤 13. Hito 13: Rediseño Integral del Command Center del Trader (`perfil.html`)
* **Problema Previo:** La vista de perfil carecía de estética profesional; presentaba exceso de tarjetas redondeadas poco integradas, falta de rigor contractual para el plan PRO y fallas visuales en pantallas móviles.
* **Solución Implementada:**
  1. **Estética Dark Luxury / Linear:** Banner HUD de identidad con avatar generado por iniciales, píldora de estatus de conexión activa (`Online · v3.2`) y badges de suscripción (*Free* vs *PRO Institucional*).
  2. **Navegación por Pestañas WAI-ARIA:** Estructura modular accesible por teclado (`role="tablist"` / `role="tabpanel"`) dividida en:
     * **General:** Resumen de cuenta, telemetría de trading y accesos rápidos (Quick Dock).
     * **Membresía:** Estado de suscripción, beneficios desbloqueados y botón de consulta del contrato PRO.
     * **Seguridad:** Gestión de contraseñas, sesiones activas y autenticación.
     * **Preferencias:** Zonas horarias, unidades de cotización y alertas.
  3. **Modal Contractual de Términos y Condiciones PRO:**
     * Creación de un modal legal formal para membresías PRO que estipula el alcance de la inteligencia cuantitativa, el descargo de responsabilidad de no-asesoramiento financiero (No Financial Advice) y los acuerdos de servicio vinculantes.
     * Reemplazo de enlaces legados como `"Acceder a Señales PRO →"` por accesos claros al Terminal de Mercados (`/mercados.html`).
  4. **Optimización Responsive Móvil:** Eliminación de tarjetas con bordes excesivos y layouts rígidos, logrando una interfaz limpia y proporcional a cualquier tamaño de pantalla.

---

## 📚 14. Hito 14: Rebranding Institucional "Educación" → "Playbooks Operativos"
* **Justificación Estratégica:** En el contexto de AEON Intelligence como terminal cuantitativa para traders institucionales, el término "Educación" remitía a cursos o academias minoristas convencionales. El nuevo concepto **"Playbooks Operativos"** refleja manuales de ejecución sistemática, gestión de Order Flow, explotación de ZAPs y control de riesgo profesional.
* **Implementación:**
  * **Portada (`index.html`):** Título de sección actualizado a *"Playbooks Operativos"*, con subtítulo orientado a la ejecución institucional y ancla dual `#playbooks` con compatibilidad retroactiva para enlaces legados `#educacion`.
  * **Navegación Global:** Actualizado en [`src/js/templates/navbar.js`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/js/templates/navbar.js) con nuevo icono SVG de manual institucional.
  * **Páginas Satélite y Legales:** Sincronizado en `perfil.html` (Quick Dock y footer), `aviso-legal.html`, `privacidad.html` y `cookies.html`.

---

## 📱 15. Hito 15: Optimización de Copia de Perfil & Paridad Dimensional de Tarjetas de Mercados
* **Problema 1 (Copia Redundante):** En el navbar y menú lateral, la etiqueta decía *"Mi Perfil"* y *"MI CUENTA"*, lo cual resultaba redundante para un usuario ya registrado y autenticado.
  * **Solución:** Actualizado a **`Perfil`** y **`CUENTA`** en todos los componentes de navegación.
* **Problema 2 (Disparidad de Tamaño en Mercados Móvil):** En `mercados.html`, 4 activos insignia (Bitcoin, Oro, Nasdaq, Euro) tenían un botón de acción inferior (`[ Analizar ZAP → ]`) midiendo ~409px, mientras que las otras 10 tarjetas carecían de esta fila y medían ~352px. Al deslizar el carrusel táctil, la disparidad provocaba saltos bruscos e incómodos.
  * **Solución:**
    1. **Acción Institucional Dual en [`marketCard.js`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/js/templates/marketCard.js):** Para los 10 activos sin gráfico ZAP directo en `/analisis.html` (DXY, AUD/USD, GBP/USD, etc.), se integró el botón **`[ Auditar con IA ✦ ]`**. Al pulsarlo, interactúa reactivamente con `chatWidget.js` para abrir el Copiloto IA y pre-llenar la consulta de auditoría institucional del activo.
    2. **Flexbox Elástico en [`market.css`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/css/components/market.css):** Reglas `align-items: stretch` en `.markets-grid-layout`, `align-self: stretch` en `.market-card`, `.market-thesis-box { flex: 1 1 auto }` y `.market-card-action { margin-top: auto }`.
    3. **Verificación Automatizada:** Se comprobó mediante Playwright una paridad de **0.00px de variación** entre las 14 tarjetas en resoluciones iPhone SE (375px), iPhone 12/13/14 (390px), iPhone Pro Max (430px) y Android (360px).

---

## 🌌 16. Hito 16: Limpieza y Despeje Visual del Hero Institucional
* **Problema:** Sobre la ilustración 3D cuántica del Hero flotaba un recuadro inferior con el texto `ESTADO DE LIQUIDEZ: Expansión Global [ Risk-On ]` y `"El contexto que necesitas antes de operar."`. La frase era idéntica al propio título H1 de la portada y el estado macro se analiza en detalle en el *Daily Macro Briefing*, saturando innecesariamente la composición artística.
* **Solución:**
  1. **Eliminación en [`index.html`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/index.html):** Se removió el nodo `.hero-hud-bottom`.
  2. **Optimización en [`hero.css`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/src/css/components/hero.css):** Se limpiaron las reglas huérfanas de `.hero-hud-bottom` y se redujo la sombra del gradiente inferior de `.hero-visual-overlay` (de 90% a 35%), permitiendo que la topografía cuántica y la esfera 3D brillen con total nitidez. Se mantuvo la insignia superior minimalista `AEON INTELLIGENCE` con el pulso cuántico.

---

## 🛡️ 17. Hito 17: Auditoría Integral de Seguridad, Blindaje Atómico de Cuotas IA y Hardening PostgreSQL
* **Contexto:** Auditoría técnica externa exhaustiva de arquitectura de seguridad (modelos Claude Opus/Sonnet) sobre las migraciones SQL (00001–00005) y la Edge Function server-side `aeon-chat`.
* **Hallazgos y Mejoras de Arquitectura:**
  1. **Eliminación de Race Conditions en Reembolsos de Cuota (Capa 4/Catch):**
     * **Problema Previo:** Si la IA fallaba en Capa 5, el bloque `catch` de la Edge Function realizaba un flujo `select-then-update` secuencial manual en cliente para devolver la cuota restando 1. En escenarios concurrentes con fallas simultáneas, dos lecturas paralelas podían pisarse y perder el conteo exacto de reembolsos.
     * **Solución Implementada ([`00006_ai_quota_refund_and_security_hardening.sql`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/supabase/migrations/00006_ai_quota_refund_and_security_hardening.sql)):** Creación del Stored Procedure atómico `public.refund_ai_quota(p_user_id UUID)` que ejecuta `UPDATE public.user_ai_usage SET daily_requests = GREATEST(daily_requests - 1, 0) WHERE user_id = p_user_id;` en una sola sentencia SQL atómica donde el motor de Postgres gestiona el bloqueo a nivel de fila.
     * **Blindaje PostgREST:** `REVOKE ALL ON FUNCTION public.refund_ai_quota(UUID) FROM PUBLIC, anon, authenticated;` y `GRANT EXECUTE ... TO service_role;`.
     * **Integración en Edge Function ([`aeon-chat/index.ts`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/supabase/functions/aeon-chat/index.ts)):** Invocación directa vía `supabaseAdmin.rpc("refund_ai_quota", { p_user_id: verifiedUserId })`.
  2. **Hardening de `search_path` en Funciones `SECURITY DEFINER`:**
     * Se estandarizó la directriz de seguridad de Postgres incorporando `SET search_path = public` a todas las funciones existentes: `handle_new_user()`, `protect_profile_tier()`, y `get_track_record_summary()`, mitigando vectores teóricos de búsqueda de esquema y escalación de privilegios.
  3. **Robustez y Consistencia en la Capa 2 de Autorización (`aeon-chat`):**
     * **Paridad de Roles:** Se incluyó `profile?.tier === "admin"` en la comprobación de acceso (`isPro`), evitando bloqueos 403 espurios a cuentas administradoras.
     * **Trazabilidad sin Pérdida de Principio Fail-Closed:** Se añadió logging de diagnóstico (`console.error`) ante errores transitorios de red en consultas a `profiles` y `subscriptions` para distinguir caídas de conexión de denegaciones legítimas de membresía.
  4. **Auditoría de Bundles de Producción y Superficie de Ataque:**
     * **Inspección de Bundles Vite (`dist/`):** Verificación de aislamiento de credenciales. Cero exposición de claves privadas (`SUPABASE_SERVICE_ROLE_KEY`, `BINANCE_SECRET`, `TELEGRAM_TOKEN`, `GEMINI_API_KEY`, etc.); únicamente viaja la `VITE_SUPABASE_ANON_KEY` pública requerida para RLS.
     * **Storage Buckets:** Verificación de ausencia de riesgo en Supabase Storage (las capturas de gráficos se procesan transient en memoria y los comprobantes cripto se auditan vía hash alfanumérico).
     * **Row Level Security (RLS):** 100% de tablas relacionales del esquema `public` con políticas RLS activadas e inmutabilidad garantizada.

---

## 💳 18. Hito 18: Pasarela de Pagos Cripto con Binance Pay, Modal Clickwrap y Panel Administrativo Móvil

* **Propósito y Estrategia Comercial:** Implementar la infraestructura de monetización para el lanzamiento de AEON Intelligence sin intermediarios bancarios ni comisiones de red abusivas, empleando stablecoins (USDT) a través de Binance Pay para traders de América Latina e internacionales.
* **Estructura de Precios de Lanzamiento:**
  * **Pase Semanal de Prueba (7 días):** \$1.99 USDT — Acceso total al Copiloto IA y Zonas ZAP sin compromiso.
  * **Membresía Mensual (30 días):** \$6.99 USDT — El estándar institucional más popular con renovación flexible.
  * **Pase Trimestral (90 días):** \$14.99 USDT — Máximo valor operativo con 28% de descuento efectivo.
* **Componentes y Arquitectura de la Solución:**
  1. **Modal de Checkout Institucional en 3 Pasos (`perfil.html`):**
     * **Paso 1 (Planes y Clickwrap Legal Obligatorio):** Selector de 3 niveles con insignias visuales dinámicas. Botón de proceder bloqueado mediante checkbox contractual ("chulito") que exige la aceptación sin reservas de los Términos de Servicio, Descargo NFA y Política Estricta de No Reembolso para software digital.
     * **Paso 2 (Transferencia Cripto con QR):** Visualización del código QR oficial de Binance Pay, Pay ID oficial (`401032901` - AEON INTELLIGENCE) con botón de copiado de un toque, e ingreso validado del ID de transacción / Order ID de Binance Pay.
     * **Paso 3 (Confirmación y Fast-Track):** Resumen detallado de la orden en cola prioritaria con Terminal ID y enlace directo prellenado a Telegram de soporte (`@Soporte_AEON`).
  2. **Auditoría de Seguridad y Corrección de 6 Vulnerabilidades Críticas:**
     * **Renovaciones Limpias de Suscripción:** Reemplazo del patrón roto `ON CONFLICT (id) DO NOTHING` por expiración explícita (`status = 'expired'`) antes de la inserción de la nueva vigencia.
     * **Sincronización de Esquema SQL:** Alineación estricta de valores de `payment_method` (`binance_pay`, `usdt_trc20`, `usdt_bep20`) entre el cliente JS y los CHECK constraints de PostgreSQL.
     * **Calibración a Columnas Reales de Base de Datos:** Eliminación de llamadas a columnas inexistentes (`updated_at` en `profiles`, `current_period_start` y `updated_at` en `subscriptions`), garantizando ejecución limpia sin errores `42703`.
     * **Order IDs Criptográficos:** Sustitución de `Math.random()` por `crypto.getRandomValues()` (generación segura de 10 caracteres hex base-16).
     * **Aislamiento Fail-Closed en Frontend:** Bloqueo estricto del avance a la vista de confirmación ante cualquier error o excepción en la llamada `insert` a Supabase.
     * **Protección de Rol Administrador:** Prevención de auto-degradación de cuentas admin si el titular realiza pagos o pruebas en la pasarela.
   3. **Panel Administrativo Web Móvil (`admin-pagos.html` & `src/js/admin-pagos.js`):**
      * Panel responsivo con diseño Dark Luxury protegido por verificación de rango `tier = 'admin'` a nivel de frontend y de base de datos.
      * Consulta reactiva de órdenes en estado `pending` mediante RPC `admin_list_pending_payments()`.
      * Activación instantánea con 1 clic mediante `approve_crypto_payment(p_payment_id)` o rechazo vía `admin_reject_payment()`.
      * Operatividad 100% autónoma desde smartphones sin requerir acceso a terminales SSH ni consola CLI.

---

## ⚡ 19. Hito 19: Expansión de la Terminal a 17 Activos Globales (Plata Spot XAG, Petróleo WTI y Ethereum ETH)
* **Objetivo:** Ampliar el abanico operativo de la terminal institucional incorporando los activos de mayor volumen mundial de trading en materias primas y criptomonedas, alcanzando un universo de 17 activos globales.
* **Activos Añadidos:**
  1. **Plata Spot al Contado (`XAGUSD` / `XAG_USD`):** Metales preciosos. Diseñado con badge SVG metálico plateado `AG`, cotización a 3 decimales de precisión y correlación microestructural con el Oro.
  2. **Petróleo Crudo WTI (`USOIL` / `WTICO_USD`):** Sector Energía. Incorporación de filtro dedicado `🛢️ Energía (1)` con badge institucional de combustible y sesgo de oferta/demanda OPEP+.
  3. **Ethereum (`ETHUSD` / `ETH_USD`):** Sector Cripto. Convivencia dual con Bitcoin en el filtro `₿ Cripto (2)`, con badge facetado índigo `Ξ` y cotización en tiempo real vía API pública de Coinbase/Binance.
* **Optimización en el Motor Autónomo (`aeon_autonomous_engine.py`):**
  * Ingesta de 14 activos en un solo lote OANDA v20 + consultas directas de bajo costo para cripto.
  * **Cero llamadas a TwelveData** y cálculo determinista de VWAP, dPOC y niveles S1/R1 para cada nuevo activo.

---

## 🏦 20. Hito 20: HUD de Macro Liquidez & Rendimientos de la Fed (Las 5 Joyitas del Banco Central)
* **Propósito Estratégico:** Ofrecer a los traders una lectura directa e instantánea de la política monetaria de la Reserva Federal y las condiciones de liquidez global, democratizando datos que tradicionalmente solo están al alcance de mesas institucionales o terminales Bloomberg.
* **Los 5 Indicadores Implementados:**
  1. **US10Y (Rendimiento del Bono del Tesoro a 10 Años):** Benchmark mundial de la tasa libre de riesgo y costo de capital.
  2. **US02Y (Rendimiento del Bono del Tesoro a 2 Años):** Barómetro de expectativas a corto plazo sobre las tasas Fed; monitoreo de inversión de curva de rendimientos ($10Y - 2Y$).
  3. **FEDFUNDS (Tasa Efectiva de Fondos Federales):** Tasa interbancaria oficial fijada por el FOMC.
  4. **RRPONTSYD (Reverse Repo Facility de la Fed):** Drenaje o inyección de liquidez ociosa en el sistema bancario.
  5. **WALCL (Balance Total de la Reserva Federal):** Activos totales del banco central (indicador indiscutible de Quantitative Easing vs Quantitative Tightening).
* **Arquitectura de Sincronización Multi-Cadencia (`aeon_autonomous_engine.py`):**
  * **Fast Cadence (3–5 min):** Rendimientos US10Y y US02Y consultados en horario de mercado vía Yahoo Finance con fallback a FRED.
  * **Macro Cadence (30–60 min):** Tasas oficiales FEDFUNDS, balance WALCL y RRP extraídos directamente de la API de St. Louis Fed FRED.
* **Gobernanza de Base de Datos & PostgreSQL:**
  * Tabla `public.macro_liquidity` con políticas RLS Zero-Trust (`SELECT` público, modificaciones restringidas a `service_role`).
  * Trigger idempotente `trg_log_macro_liquidity_change` para registro histórico de variaciones reales sin redundancia.
* **Interfaz de Usuario (UI/UX) y Enfoque Formativo:**
  * Componente `macroLiquidityHUD.js` con badges dinámicos de régimen (Expansión / Contracción / Neutral).
  * Modal explicativo interactivo (`js-macro-info`) que traduce cada métrica a lenguaje claro para el trader formativo.
  * Incorporación del **Playbook Operativo #5** (*"Macro Liquidez & Yields Fed: El Pulso del Banco Central"*) en `src/data/education.json`.
  * Integración simultánea en la portada principal (`index.html` bajo el Radar) y en la cabecera de `mercados.html`.

---

## 💎 21. Hito 21: Refactorización UX — Carrusel de Playbooks, Desbloqueo Móvil y Actualizaciones Realtime In-Place
* **Problema 1 (Desktop Playbooks Wrap):** El grid responsive envolvía la 5ª tarjeta de Playbooks a una segunda fila solitaria, rompiendo la armonía estética en pantallas grandes.
  * **Solución:** `.education-grid` refactorizado a carrusel horizontal flex con `scroll-snap-type: x mandatory`, barra de scroll obsidian sutil y flechas de navegación táctica **`←` y `→`** en la cabecera con desplazamiento suave de `±330px`.
* **Problema 2 (Corte Vertical en Mercados Móvil):** La regla `body.markets-body-locked { overflow: hidden; height: 100dvh }` impedía que el usuario hiciera scroll vertical, dejando cortados el análisis técnico, los tags y el botón *"Auditar con IA"* de las tarjetas de mercado.
  * **Solución:** Desbloqueo a `overflow-y: auto; min-height: 100dvh; height: auto` con padding inferior ergonómico de `4rem`. Se preserva el swipe táctil horizontal entre activos y se habilita un scroll vertical natural para leer la tarjeta completa.
* **Problema 3 (Reseteo Brusco de Scroll en Tiempo Real):** En `mercados.html`, cada tick o actualización de precios invocaba `renderMarkets()`, el cual borraba el HTML del carrusel y ejecutaba `container.scrollTo({ left: 0 })`, regresando bruscamente al usuario al primer activo mientras leía.
  * **Solución:** Refactorización de `handleLiveUpdate` en `src/js/markets.js` para realizar una actualización atómica *in-place* (`existingCard.replaceWith(newCard)`). Se incorporó la animación `.card-live-pulse` con un destello cian suave y se preservó `scrollLeft` intacto. El scroll solo se resetea al inicio si el usuario hace clic deliberadamente en un filtro de categoría o escribe en el buscador.

---

## 🤖 22. Hito 22: AEON Active Copilot Harness — Terminal Proactiva con Centinela Cuántico, Fan-Out en Tiempo Real, Guardrail Anti-Overtrading y Bitácora de Trading (100% en Producción)

* **Filosofía del Trader y Propósito Estratégico:**
  * En el trading institucional, las ventanas de liquidez y las mejores entradas se evaporan en cuestión de segundos o pocos minutos. Un asistente de inteligencia artificial puramente reactivo (que espera a que el usuario escriba una pregunta en el chat) llega tarde a la acción del precio.
  * Con el **AEON Active Copilot Harness**, la plataforma evoluciona a una terminal centinela proactiva: el motor cuantitativo patrulla el mercado las 24 horas y, en el milisegundo exacto en que se produce una alineación de alta probabilidad, genera una alerta táctica con síntesis de lenguaje natural ultrarrápida, emite un aviso sonoro de radar en el terminal del trader y prepara la conversación con un análisis completo de riesgo/beneficio.
* **Componentes y Arquitectura de la Solución (5 Pasos Verificados en Producción):**
  1. **Motor Cuántico VPS: Centinela de Confluencias (`scripts/quant/harness_sentinel.py` & `aeon_autonomous_engine.py`):**
     * **Algoritmo de Detección:** Escaneo en cada ciclo de 20s para los 4 Reyes del Mercado y activos de alta volatilidad bajo la fórmula estricta de confluencia:
       $$\text{Confluencia Activa} = (Price \in \text{ZAP}) \land (\text{BSL Swept} \lor \text{SSL Swept}) \land (dist\_dpoc > 0) \land (cooldown \ge 15\text{m})$$
     * **Persistencia de Estado y Tolerancia a Fallos:** Registro atómico de marcas de tiempo en `data/harness_sentinel_state.json` para garantizar que los reinicios del proceso no generen spam ni dupliquen alertas.
     * **Aislamiento de Hilo No Bloqueante:** Despacho de la alerta mediante un hilo de ejecución independiente (`threading.Thread`) con un timeout HTTP estricto de **3.0 segundos**, blindando el bucle principal de 20s del motor de agentes contra cualquier lentitud externa de red.
  2. **Gobernanza de Base de Datos: Migración 00010 (`00010_active_copilot_harness_events_and_journal.sql`):**
     * **Tabla `trading_signal_events`:** Bus de eventos con TTL de 2 horas (expiración temporal sin sobrecarga de almacenamiento), `event_id` determinista para deduplicación, políticas RLS Zero-Trust para consulta pública y publicación activa en `supabase_realtime`.
     * **Tabla `user_trade_journal`:** Bitácora personal de órdenes y auditorías pre-trade (`checklist_audit`, `trade_opened`, `trade_closed`) con la bandera de advertencia `in_consolidation` para registrar si el trader intentó operar en zonas de bajo volumen o compresión.
     * **Stored Procedure `check_overtrading_guardrail`:** Función de control de sobreoperativa emocional en ventana móvil de 45 minutos. Implementada con `SECURITY DEFINER`, `SET search_path = public` y blindaje anti-IDOR validado por arquitectura:
       ```sql
       IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id THEN
         RAISE EXCEPTION 'No autorizado para consultar la bitacora de otro usuario (IDOR Guard)';
       END IF;
       ```
  3. **Edge Function `aeon-copilot-event` (Supabase Cloud — `ytccnxlfakjilxwauxic`):**
     * **Inferencia Ultra-Rápida:** Integración directa con **Gemini 2.5 Flash-Lite**, alcanzando tiempos de respuesta de 1.1s a 1.2s.
     * **Síntesis Quirúrgica:** Generación de diagnósticos ejecutivos de máximo 2 oraciones ($\le 45$ palabras) sin saludos ni preámbulos vacíos, destacando el activo, la zona ZAP de impacto, el barrido de liquidez y el sesgo cuantitativo inmediato.
     * **Idempotencia y Fallback:** Verificación de existencia previa por `event_id` y generación inmediata de síntesis algorítmica determinista en caso de saturación transitoria de la API de IA.
     * **Fan-Out Dual:** Inserción en la base de datos PostgreSQL y emisión instantánea vía WebSocket broadcast al canal Realtime `'aeon_harness_alerts'`.
  4. **Frontend Copilot Client (`src/js/components/chatWidget.js` & `src/css/components/chat.css`):**
     * **Escucha Proactiva Dual:** Suscripción combinada al canal de broadcast `'aeon_harness_alerts'` y al feed `postgres_changes` de `trading_signal_events`.
     * **Radar Chime Sintetizado con WebAudio API:** Generador de audio nativo mediante oscilador sinusoidal (`880Hz` a `1760Hz` con decaimiento exponencial en `0.25s`), logrando un timbre cyber elegante sin descargar archivos de audio externos ni generar peticiones de red.
     * **Toast Callout Flotante:** Globo de notificación táctica sobre el botón FAB con pulso cian (`.callout-pulse`) y control de snooze para pausar alertas por 15 minutos en momentos de alta concentración.
     * **Renderizado Markdown Seguro:** Conversión de sintaxis `**negrita**` a `<strong>` para destacar niveles numéricos y recomendaciones operativas sin vulnerabilidades XSS.
     * **Persistencia entre Sesiones y Recargas:** Consulta automática del último evento activo en `trading_signal_events` al inicializar el widget o cambiar de sesión, garantizando que el usuario nunca pierda una alerta tras refrescar la página.
     * **Embudo de Conversión Freemium vs PRO:**
       * **Usuario Free (`free@aeontest.com`):** Alerta proactiva visible acompañada de una tarjeta de paywall con CTA claro para desbloquear el análisis completo adquiriendo la membresía PRO.
       * **Usuario PRO (`pro@aeontest.com`):** Chat totalmente abierto, inyección del contexto del evento y auditoría en profundidad.
  5. **Validación en Producción y Hallazgos Reales:**
     * **Prueba en Vivo en `aeondev.vercel.app`:** Simulación de disparo en Oro (XAUUSD) con respuesta real de Gemini en 1.1s y recepción inmediata del broadcast en el navegador.
      * **Comportamiento Cuantitativo Institucional Verificado:** El Copiloto PRO analizó la estructura del mercado y aconsejó explícitamente **rechazar el trade** debido a un ratio Riesgo/Beneficio (R/R) desfavorable de 0.47:1, demostrando la fidelidad de la IA a las directrices de preservación de capital institucional.
      * **Lección Aprendida sobre Red y AdBlock:** La Protección Mejorada contra Rastreo de Firefox y algunos bloqueadores de anuncios pueden clasificar peticiones a `supabase.co` como rastreadores (`TypeError: NetworkError`), lo cual se documentó para soporte a usuarios en producción.

---

## ⚡ 23. Hito 23: Optimización Quirúrgica de Rendimiento de Carga, Resiliencia Zero-Waterfall y Sanitización de Secretos (100% en Producción)

* **Propósito y Contexto de Ingeniería:**
  * Tras incorporar el Active Copilot Harness, el HUD de Macro Liquidez y los 17 activos en tiempo real, el tiempo de carga percibido se incrementó de ~300ms a ~500ms debido a la competencia por ancho de banda en el arranque y a la ejecución de consultas independientes en cascada (*waterfall*).
  * Asimismo, se detectó preventivamente por GitHub Secret Scanning y GitGuardian la presencia del token del bot de Telegram en la migración `00007_telegram_payment_alerts.sql`.
  * Se desplegó una intervención arquitectónica integral y auditada con lupa para erradicar cualquier cuello de botella, sanitizar credenciales y dotar a la plataforma de honestidad visual estricta.

* **Componentes y Arquitectura de la Solución (Verificados en Producción):**
  1. **Sanitización de Secretos y Rotación Zero-Trust:**
     * **Rotación en BotFather:** El token anterior fue revocado inmediatamente en Telegram y sustituido por uno nuevo.
     * **Aislamiento en Supabase:** La función `notify_telegram_payment()` se actualizó directamente en el SQL Editor de producción en la nube.
     * **Placeholder Seguro en Git:** En `00007_telegram_payment_alerts.sql` se sustituyó el valor literal por `'TU_TELEGRAM_BOT_TOKEN_AQUI'`, cerrando las alertas en GitHub y GitGuardian como `Revoked`.
  2. **Hidratación Progresiva del Copilot (`src/js/navbar.js`):**
     * **Punto Único Centralizado:** Se aplicó `requestIdleCallback` (con fallback a `setTimeout(..., 250ms)`) exclusivamente en `navbar.js` (L110).
     * **Liberación del Hilo Principal:** El Navbar se pinta de inmediato (2ms) y el montaje del chat junto con sus consultas a Supabase (`getUserAccessState`, `subscriptions`, `trading_signal_events`) y su WebSocket se difieren hasta que la pantalla principal está renderizada. Cero duplicación en HTML.
  3. **Disparo Anticipado de Red & Zero-Waterfall (`src/js/main.js`):**
     * **Concurrencia con `Promise.allSettled`:** Se agruparon las consultas independientes en 4 ramas paralelas (`Sesión -> Señales`, `Macro Liquidez HUD`, `Briefing`, `Noticias`).
     * **Despacho Inmediato en L1:** `networkPromises` se instancia en la primera línea de `initApp()`, permitiendo que el stack de red del navegador abra los sockets TLS mientras la CPU renderiza síncronamente los elementos locales (`renderEducation`, `initPrices`, `initChart`).
  4. **Jerarquía L1 Cache con TTL Activo de 60s (`src/js/markets.js`):**
     * **L1 (`sessionStorage`):** Almacena el último snapshot recibido en la sesión activa del usuario.
     * **Purga Estricta de Datos Obsoletos:** `getL1Cache()` evalúa `(Date.now() - ts) < 60000`. Si el dato superó los 60 segundos, ejecuta `sessionStorage.removeItem` y retorna `data: null`, forzando el fallback de build para evitar presentar cotizaciones viejas.
  5. **Honestidad Visual Stale vs Fresh (Mercados & Calendario):**
     * **Micro-Badges Dinámicos:** La interfaz arranca en `⟳ Sincronizando feed...` (con pulso ámbar/cian) y solo transiciona a `● En Vivo` (verde neón) cuando Supabase entrega el payload fresco o el canal Realtime confirma el enlace.
     * **Cero `!important`:** Implementado en `market.css` y `calendar.css` con variables de diseño nativas (`var(--accent-hover)`, `var(--muted)`).
  6. **Aislamiento de Fallos Parciales & Manejo Honesto de Días Vacíos:**
     * **Degradación por Widget:** Si una consulta falla (ej. Macro Liquidez), solo ese widget muestra su estado offline; los 17 activos y el calendario continúan operando.
     * **Días sin Eventos en Calendario:** Se eliminó el falso positivo que trataba un array vacío `[]` como error de red. Si Supabase devuelve cero eventos en un feriado o fin de semana, el badge se mantiene `● En Vivo` y la tabla renderiza su estado vacío legítimo (*"Cero Eventos en este Filtro"*), sin sobreescribir con datos desactualizados del snapshot de build.
  7. **Red de Seguridad para Rollback:**
     * Etiqueta inmutable `git tag pre-perf-opt` creada como salvaguarda ante cualquier reversión requerida vía `git revert`.
     * Build de producción Vite completado en **390 ms** con 0 errores y 0 advertencias.
