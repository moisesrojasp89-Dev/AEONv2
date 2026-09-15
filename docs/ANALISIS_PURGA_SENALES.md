# Informe de Análisis: Purga del Paradigma "Señales" y Diagnóstico de Documentación

**Tipo de documento:** Informe de Descubrimiento y Auditoría de Arquitectura (Fase 0)  
**Autor:** Agente Constructor de AEON  
**Destinatarios:** Moises (Aeon Trading Group) & Claude (Arquitecto Técnico Externo)  
**Fecha:** 15 de Septiembre de 2026  
**Estado:** ✅ Análisis Concluido — Pendiente de Revisión y Checkpoint para Fase 1  

---

## 0. Declaración de Cumplimiento de la Regla de Oro

En estricta observancia del **Brief de Análisis (Fase 0)** dejado por el Arquitecto:
- **Cero modificaciones de código:** No se alteró, eliminó ni renombró ningún archivo `.js`, `.py`, `.ts`, `.html` ni `.css`.
- **Cero modificaciones de base de datos:** No se modificó el esquema de Supabase, ni tablas, columnas, RPCs, políticas RLS, ni se ejecutaron migraciones SQL.
- **Cero ediciones sobre los 7 documentos vigentes** de `docs/`.
- **Cero ramas o PRs de refactor**.
- El presente archivo constituye el **único entregable formal** de esta fase de descubrimiento.

---

## 1. Resumen Ejecutivo del Diagnóstico

El análisis integral del repositorio confirmó que **la decisión estratégica del Hito MAS v1.1.0** (13 de Septiembre de 2026) —consolidar AEON como una **Terminal de Inteligencia Cuantitativa y Contexto Estructural**, erradicando el modelo de alertas u oráculos de compra/venta— **fue implementada exitosamente en el núcleo algorítmico y de inferencia** (Edge Functions con filtros Anti-Oráculo, Centinela cuántico por confluencias microestructurales y AI Trader Journal con memoria persistente).

Sin embargo, el repositorio presenta una **doble deuda técnica latente**:
1. **Remanentes Fantasma en Frontend y Carga de Red:** Existe una sección completa de "Señales" oculta en `index.html` (`style="display: none;" data-shadow-mode="true"`) que continúa ejecutando código en cada carga de página (`main.js` invoca `loadSignals()`), importando `signalService.js`, instanciando suscripciones a Supabase Realtime y consultando tablas legadas (`signals` y `signals_pro_data`) que ya no tienen ningún emisor activo en el backend.
2. **Deuda de Nomenclatura en Base de Datos:** Las tablas del nuevo bus de eventos y del motor de excursion cuantitativo fueron bautizadas con el término legado "signal" (`trading_signal_events`, `signal_cooldowns`, `signal_post_mortem`), a pesar de que su contenido es 100% estructural (microScore, confluencias, dPOC, MFE/MAE).
3. **Incoherencia y Desincronización Documental:** Existen duplicaciones textuales graves en la bitácora (`AEON_CHANGELOG_BITACORA.md` tiene dos secciones "3" y repite los Errores 1-3 en la sección "4"), residuos de la Fase 4 cancelada (diagramas con MetaTrader 5 y sockets ZeroMQ en `CURRENT_STATE_VS_TARGET.md`), y referencias a archivos inexistentes (`harness_orchestrator.py` en `GUIA_HARNESS_ENGINEERING.md`).

---

## 2. Frente A — Inventario Exhaustivo de Remanentes "Señales"

### Criterios de Clasificación:
- 🔴 **Eliminar por completo:** Código muerto, sin consumidores activos en la arquitectura vigente, seguro de erradicar.
- 🟡 **Renombrar / reescribir terminología:** La funcionalidad es cuantitativamente válida y activa bajo el nuevo paradigma; solo el lenguaje técnico o nomenclatura quedó desactualizado.
- 🟢 **Ya migrado correctamente:** Componente auditado que ya cumple con el paradigma cuantitativo; se deja constancia como evidencia de inspección.

---

### A.1 Frontend (Vite / Vanilla JS / CSS)

| Archivo / Componente | Líneas | Clasificación | Hallazgo / Diagnóstico |
|---|:---:|:---:|---|
| `index.html` | 43 | 🔴 **Eliminar** | `<link rel="stylesheet" href="/src/css/components/signals.css" />`. Estilos cargados globalmente para un componente en desuso. |
| `index.html` | 180–233 | 🔴 **Eliminar** | Sección `<section class="signals-section container" id="senales" style="display: none;" data-shadow-mode="true">`. Contiene markup completo de señales de compra/venta, switch live/history, KPIs de 1:2.0-1:3.0 y contenedor `signals-list`. Al estar en `display: none;`, ningún usuario la ve, pero consume parsing del DOM. |
| `src/css/components/signals.css` | 1–320 (todo) | 🔴 **Eliminar** | Archivo completo de 320 líneas dedicado a tarjetas de señales, overlay difuminado de entrada/SL/TP, niveles numéricos y pills de resultado. Sin uso activo fuera de la sección oculta. |
| `src/css/responsive.css` | 13, 27 | 🔴 **Eliminar** | Reglas de media query `.signal-levels { ... }`. Quedarán huérfanas al remover la sección. |
| `src/js/templates/signal.js` | 1–282 (todo) | 🔴 **Eliminar** | Generador de tarjetas `freeInstitutionalCard`, `proInstitutionalCard` y `closedSignalCard`. Renderiza explícitamente `ENTRADA`, `STOP LOSS`, `TARGET`, badges de `Señal cuantitativa` y difuminado Freemium. Su único consumidor es `render.js`. |
| `src/js/services/signalService.js` | 1–202 (todo) | 🔴 **Eliminar** | Módulo de datos que consulta `DB_TABLES.SIGNALS`, `DB_TABLES.SIGNALS_PRO_DATA`, invoca el RPC `get_track_record_summary` y suscribe canales Realtime `public:signals` y `public:signals_pro_data`. Ningún otro script o página lo necesita. |
| `src/js/render.js` | 8, 22–47, 51–102 | 🔴 **Eliminar** | Funciones `renderSignals`, `renderSignalHistory` y `renderKPIBar` (barra de KPIs de señales). El resto de funciones en `render.js` (`renderEducation`, `renderPremiumFeatures`, `renderTickerBar`) son activas y legítimas. |
| `src/js/main.js` | 7–12, 19–20 | 🔴 **Eliminar** | Imports de `fetchActiveSignals`, `fetchSignalHistory`, `subscribeSignalEvents`, `renderSignals`, `renderSignalHistory`. |
| `src/js/main.js` | 49–83, 89–131 | 🔴 **Eliminar** | Variables de estado `activeSignals`, `historySignalsCache`, `currentSignalFilter` y funciones de filtrado `updateSignalsDisplay()`, `initSignalFilters()`. |
| `src/js/main.js` | 133–141, 423 | 🔴 **Eliminar** | Función `async function loadSignals()` y su llamada en arranque `await loadSignals()`. **Impacto de rendimiento:** Realiza 2 consultas de red a Supabase al cargar la página principal para alimentar una sección oculta. |
| `src/js/main.js` | 143–187 | 🔴 **Eliminar** | Función `initRealtime()` en la parte de señales: canales `public:signals` y `public:signals_pro_data` escuchando eventos `INSERT` y `UPDATE`. Desperdicio de sockets WebSocket. |
| `src/js/config/constants.js` | 10–11 | 🔴 **Eliminar** (Fase 2) | Constantes `DB_TABLES.SIGNALS: 'signals'` y `DB_TABLES.SIGNALS_PRO_DATA: 'signals_pro_data'`. Marcar como deprecadas hasta purgar la BD. |
| `src/js/config/constants.js` | 71–96 | 🔴 **Eliminar** | Enums `SIGNAL_STATUS` (`pending`, `active`, `hit_tp1`, `closed_tp`, `closed_be`, etc.) y mapa visual `SIGNAL_STATUS_CONFIG`. Vocabulario puro de señales predictivas. |
| `src/js/components/chatWidget.js` | 885, 978 | 🟢 **Ya migrado** | El widget UI despliega: `🚨 ALERTA ESTRUCTURAL · ORDER FLOW` y el botón `Auditar Escenario`. Cero lenguaje de "señal de compra/venta". |
| `src/js/components/chatWidget.js` | 919, 1046 | 🟡 **Renombrar** | Consultas a la tabla `trading_signal_events` (`loadLatestActiveAlert` y suscripción Realtime). Funcionalmente activo; solo debe actualizarse el nombre de la tabla cuando se migre la BD. |

---

### A.2 Copys de UI, Avisos Legales y Pricing / Membresías

| Archivo / Superficie | Líneas / Elemento | Clasificación | Hallazgo / Diagnóstico |
|---|:---:|:---:|---|
| `aviso-legal.html` | 37 | 🟡 **Reescribir** | *"Todo el contenido publicado en AEON (incluyendo, sin limitación, señales, análisis macroeconómicos...)"*. Debe reescribirse a *"alertas de contexto cuantitativo, análisis macroeconómicos..."*. |
| `cookies.html` | 41 | 🟡 **Reescribir** | *"...comprender qué secciones de análisis macroeconómico o señales son más relevantes para nuestros usuarios."*. Cambiar "señales" por "herramientas cuantitativas". |
| `src/data/markets.json` | 91–97 (`premiumFeatures`) | 🟢 **Ya migrado** | Los beneficios PRO son: `AEON AI Copilot`, `Matriz Cuantitativa Completa`, `Daily Macro Briefings`, `Calendario Económico Sniper`, `Zonas de Liquidez & Confluencias`. Cero mención a señales. |
| `perfil.html` | 530–585 (Modal Planes) | 🟢 **Ya migrado** | Los planes (Pase Semanal, Mensual, Trimestral) describen: *"Acceso total para probar Zonas ZAP y Copiloto IA sin compromiso"*. Cero mención a señales. |
| `index.html` | 250–264 (Sección PRO) | 🟢 **Ya migrado** | Copia: *"Todo en una sola terminal. Copilot de IA, liquidez institucional y contexto macro en tiempo real"*. Cero mención a señales. |

---

### A.3 Base de Datos (Supabase PostgreSQL, RPCs y Migraciones)

| Objeto / Tabla | Migración de Origen | Clasificación | Consumidores Activos | Diagnóstico Técnico |
|---|:---:|:---:|:---:|---|
| `public.signals` | `00001` | 🔴 **Eliminar por completo** | Ninguno (escritura). Solo lectura en `signalService.js` y RPC `get_track_record_summary`. | Tabla huérfana. Ningún proceso del motor moderno (`aeon_autonomous_engine.py` ni Centinela) inserta datos aquí. Contiene esquema legado de órdenes (`direction`, `hit_tp1`, `closed_tp`). |
| `public.signals_pro_data` | `00001` | 🔴 **Eliminar por completo** | Ninguno (escritura). Solo lectura en `signalService.js`. | Tabla huérfana vinculada a `signals`. Almacena `entry_price`, `stop_loss`, `take_profit`. Quedó 100% sin uso. |
| RPC `get_track_record_summary()` | `00002` | 🔴 **Eliminar por completo** | `signalService.js` (frontend). | Función en Postgres que computa Win Rate y Profit Factor sobre `public.signals`. Ya no representa el modelo de AEON (Terminal de Contexto, no fondo de trading ni canal de señales). |
| `public.trading_signal_events` | `00010`, `00011` | 🟡 **Renombrar terminología** | `harness_sentinel.py`, `aeon-copilot-event`, `chatWidget.js`. | **Es la tabla activa del Centinela Cuántico MAS.** No almacena señales de compra/venta, sino eventos de microestructura (`trigger_type`: `ZAP_SUPPLY_SWEEP`, `confluence_score`, `score_label`: `A+/B/VETO`, `broadcast_decision`). Su nombre contiene "signal" por inercia histórica. Candidata a renombrarse a `market_structural_events` o `terminal_context_events`. |
| `public.signal_cooldowns` | `00011` | 🟡 **Renombrar terminología** | `harness_sentinel.py` (vía RPC). | Tabla de exclusión mutua para evitar disparos repetidos del centinela en un activo durante 15 min. Funcionalidad activa; nombre legado. |
| RPC `acquire_signal_cooldown()` | `00011` | 🟡 **Renombrar terminología** | `harness_sentinel.py`. | Función atómica con UPSERT condicional en Postgres para los bloqueos temporales del centinela. Funcionalidad activa; nombre legado. |
| `public.signal_post_mortem` | `00012` | 🟡 **Renombrar terminología** | `post_mortem_engine.py`, `aeon_autonomous_engine.py`. | Tabla activa de telemetría de excursión matemática (MFE/MAE en $R$ y snapshots a T+15, T+30, T+60, T+120m). Su lógica es estrictamente estadística/cuantitativa; solo el nombre de la tabla arrastra la palabra "signal". |

---

### A.4 Edge Functions y Backend en Python

| Módulo / Archivo | Ubicación | Clasificación | Diagnóstico |
|---|---|:---:|---|
| `aeon-copilot-event` | `supabase/functions/aeon-copilot-event/index.ts` | 🟢 **Lógica migrada** / 🟡 **Nombre tabla** | Orquestador MAS v1.1.0 con doble capa desacoplada (Gate microScore $\ge 25$ y contexto macro), 4 candados anti-oráculo y regex denylist. Ya no emite señales. Solo lee/escribe en `trading_signal_events`. |
| `aeon-chat` | `supabase/functions/aeon-chat/index.ts` | 🟢 **Ya migrado** | Prompt institucional en línea 1158 establece: *"AEON es un auditor cuantitativo de mercado, NUNCA un asesor financiero ni un emisor de señales. PROHIBIDO decir 'te recomiendo entrar'..."*. Manejo determinista de precios propuestos con R:R crudo y advertencia técnica. |
| `trade_watcher_daemon.py` | `scripts/quant/trade_watcher_daemon.py` | 🔴 **Eliminar / Archivar** | Daemon antiguo de 316 líneas para supervisar ciclos `ACTIVE -> HIT_TP1 -> CLOSED_TP` con conexión MT5. Completamente sustituido por `aeon_autonomous_engine.py`. |
| `data_provider.py` (`MT5ExnessProvider`) | `scripts/quant/data_provider.py` | 🔴 **Eliminar / Archivar** | Clase conector a MetaTrader 5 y mapeo de símbolos Exness. Pertenece a la cancelada Fase 4. |
| `docker-compose.yml` | `deploy/docker-compose.yml` | 🔴 **Eliminar / Actualizar** | Líneas 9–33 configuran el contenedor `aeon-quant-daemon` ejecutando `trade_watcher_daemon.py` con variables `MT5_SERVER_HOST=127.0.0.1`. Configuración obsoleta de la Fase 4. |
| Scripts legados de test | `scripts/test_join.mjs`, `scripts/test_realtime.mjs`, `scripts/cleanup_4d.mjs` | 🔴 **Eliminar / Archivar** | Scripts temporales de pruebas de desarrollo que interactúan con las tablas `signals` y `signals_pro_data`. |
| `harness_sentinel.py` | `scripts/quant/harness_sentinel.py` | 🟢 **Lógica migrada** / 🟡 **Nombres RPC** | Centinela de confluencia ZAP + BSL/SSL + dPOC. Lógica 100% cuantitativa. Solo invoca `acquire_signal_cooldown`. |
| `post_mortem_engine.py` | `scripts/quant/post_mortem_engine.py` | 🟢 **Lógica migrada** / 🟡 **Nombres API** | Auditor de tracking MFE/MAE. Lógica 100% estadística. Escribe en `signal_post_mortem`. |

---

### A.5 AI Trader Journal (Bitácora del Operador)

| Componente | Discriminadores / Prompts | Clasificación | Diagnóstico |
|---|---|:---:|---|
| `trader_journal` & `trader_weekly_audits` | `entry_type`: `checklist_audit`, `trade_opened`, `trade_closed` | 🟢 **Ya migrado** | Implementado bajo arquitectura Harness (MAS v1.2.0, 14-Sep-2026). El trader registra sus propias operaciones en lenguaje natural; el Copilot actúa como auditor de disciplina y sesgos, no como emisor de señales. |
| `trader_journal_harness.py` | Métodos de validación y Evaluator Agent | 🟢 **Ya migrado** | Cero ocurrencias de "señal". Validación estricta de coherencia direccional pre-INSERT, desambiguación multi-posición y matemática bifurcada de MFE/MAE. |

---

### A.6 Suites de Pruebas (`tests/`)

| Archivo de Test | Pruebas Asociadas | Clasificación | Diagnóstico |
|---|---|:---:|---|
| `test_mas_anti_oracle_and_context.py` | 5 pruebas de guardrails anti-oráculo | 🟢 **Ya migrado** | Valida que el sistema rechace verbos imperativos (`compra/vende`) y conmute a fallbacks neutrales. |
| `test_post_mortem_mas.py` | Auditoría de excursión y resolución | 🟡 **Terminología interna** | Las pruebas son cuantitativamente válidas, pero la función importada se llama `register_signal_for_post_mortem` y comentarios usan frases como "muestra de 40 señales A+". |
| `test_harness_mas.py` | Centinela y Cooldown atómico | 🟢 **Ya migrado** | Pruebas de contrato v1.0.0, blackout macro y supresión de ruido. |
| `test_trader_journal_harness.py` | Gobernanza del Journal | 🟢 **Ya migrado** | Pruebas de RLS, validación de SL/TP y cálculo MFE/MAE. |

---

### A.7 Documentación (`docs/` - Los 7 Documentos)

| Documento | Menciones Relevantes | Clasificación | Diagnóstico |
|---|---|:---:|---|
| `AEON_CHANGELOG_BITACORA.md` | Líneas 29–30, 140, 422, 448, 584, 629 | 🟢 **Histórico** / 🟡 **Copy técnico** | Líneas 29-30 documentan formalmente la erradicación del paradigma de señales. Líneas 140, 422, 448 son registros válidos de bugs pasados. Línea 629 menciona `Sesión -> Señales` en la descripción de `Promise.allSettled` de `main.js` (debe actualizarse al purgar `main.js`). |
| `AEON_ROADMAP_V2.md` | Líneas 95, 122 | 🟡 **Actualizar** | Línea 95 mantiene `SIGNAL_STATUS` en la descripción de Fase 1 sin aclarar su condición de legacy. Línea 122 describe el objetivo de Fase 6 incluyendo "Señales Cuantitativas Pro", en directa contradicción con el Hito MAS v1.1.0. |
| `CONVENTIONS.md` | Líneas 61, 80–89 | 🟡 **Actualizar** | Cita `DB_TABLES.SIGNALS`. La Sección 5 se titula *"Gobernanza Cuantitativa y Políticas de Señales"* y utiliza expresiones como *"emisión de señales en vivo"* en lugar de alertas de contexto institucional. |
| `CURRENT_STATE_VS_TARGET.md` | Líneas 18, 39–60, 80–99 | 🔴 **Inconsistencia Crítica** | **Sección 2:** Describe la máquina de estados con `HIT_TP1`, `CLOSED_TP`, `CLOSED_BE`, `CLOSED_SL` (ciclo de señales de trading tradicionales).<br>**Sección 4:** Mantiene a MetaTrader 5 (Exness ECN) y sockets ZeroMQ en el diagrama de arquitectura de producción, a pesar de que la Fase 4 fue cancelada formalmente el 13 de Septiembre. |
| `DOSSIER_TRADER_JOURNAL_HARNESS.md` | Línea 11 | 🟢 **Ya migrado** | Documenta con total precisión la cancelación de la Fase 4 y la eliminación de "señales predictivas". Modelo de consistencia. |
| `ENGINEERING_STANDARDS.md` | Líneas 83, 108, 132, 135 | 🟡 **Actualizar** | Cita `get_track_record_summary`. Sección 6 establece: *"Ninguna estrategia... emitirá señales a usuarios Pro"*, *"descartados del motor de señales"*, *"La frecuencia de emisión de señales está dictada..."*. Debe sustituirse por "eventos de contexto estructural / confluencias cuantitativas". |
| `GUIA_HARNESS_ENGINEERING.md` | Líneas 88, 122 | 🟢 **Ya migrado** | Explica la obligación del arnés de bloquear señales predictivas o recomendaciones mediante guardrails deterministas por código. |

---

## 3. Frente B — Diagnóstico de la Documentación

### B.1 Auditoría de Consistencia Interna

#### 1. Secciones Duplicadas y Numeración Rota en `AEON_CHANGELOG_BITACORA.md`
- **Doble Sección 3:**
  - Línea 105: `## 🐞 3. Registro de Errores Críticos (Bugs) y Malas Prácticas Resueltas` (Contiene Errores 1 al 6 y Refactorización D del Calendario).
  - Línea 176: `## 🧠 3. Evolución del Cerebro Cuántico y Agentes Autónomos (AEON Engine)` (Contiene Motor Cuántico Universal, DXY ICE y Modo Weekend Wrap).
- **Repetición Textual de Bugs en Sección 4:**
  - Línea 205: `## 🐞 4. Registro de Errores Críticos (Bugs) y Malas Prácticas Resueltas`.
  - Los **Errores 1, 2 y 3** (Compilación Vercel, Bucle Auto-Recargas de Vite y Rate Limits de TwelveData) **aparecen repetidos casi textualmente** respecto a la sección 3 anterior, antes de continuar con los errores nuevos 4 al 7.
- **Desorden Estructural y Cronológico:**
  - El documento inicia con `## 1. Hitos de Arquitectura y Nuevas Generaciones`, donde se agruparon los hitos más recientes (MAS v1.1.0 del 13 de Septiembre y MAS v1.2.0 del 14 de Septiembre).
  - Luego de las secciones 2 a 5, el documento salta en línea 277 a `## 🏛️ 6. Hito 6: Terminal de Análisis Institucional...` y continúa secuencialmente hasta `Hito 23` (línea 613). 
  - Un lector nuevo no puede discernir si los Hitos 1 a 5 son los bloques iniciales del Roadmap (Agosto) o si son los hitos recientes de Septiembre.

#### 2. Numeración Rota en `CONVENTIONS.md`
- En la línea 30, la Sección 2 arranca directamente con `2. Tokens de Diseño (src/css/variables.css)`, omitiendo el ítem número 1.

#### 3. Referencias Cruzadas a Archivos Fantasma
- En `GUIA_HARNESS_ENGINEERING.md` (línea 121), la tabla de mapeo cita a `harness_orchestrator.py` como el *"Orquestador Multi-Agente (Loop)"*. **Dicho archivo no existe en el repositorio**. La orquestación real la realizan la Edge Function `aeon-copilot-event/index.ts` y el centinela `scripts/quant/harness_sentinel.py`.

#### 4. Presencia de Features Descartadas como si estuvieran Activas
- En `CURRENT_STATE_VS_TARGET.md`:
  - El diagrama de arquitectura de producción en Linux VPS LD4 Londres describe a **MetaTrader 5 (Exness ECN)** comunicándose vía **ZeroMQ / IPC Socket Server en puerto 5555** con un daemon de supervisión `trade_watcher_daemon.py`.
  - Esto contradice formalmente la decisión documentada en `AEON_CHANGELOG_BITACORA.md` (Hito MAS v1.1.0, 13 de Septiembre de 2026), donde se canceló la Fase 4 de brokers/MT5 para blindar el software contra riesgos de ejecución y proteger el producto en la web propia.
- En `deploy/docker-compose.yml`:
  - Se mantiene la definición del servicio `aeon-quant-daemon` ejecutando `trade_watcher_daemon.py` con variables de entorno para conectarse a MT5 en `127.0.0.1:5555`.

---

### B.2 Propuesta de Arquitectura de Información

Para resolver el problema de que ningún nuevo desarrollador o agente dependa del historial de chat para entender el sistema, se propone la creación de un nuevo documento índice central: **`docs/INDEX.md`** (o `docs/ARCHITECTURE.md`).

#### Estructura Propuesta para `docs/INDEX.md`:

```markdown
# AEON Architecture & System Index — Única Fuente de Verdad

## 1. Misión y Filosofía de Producto
- Definición formal: Terminal de Inteligencia Cuantitativa y Contexto Estructural.
- Los 3 Principios Inviolables:
  1. Cero recomendaciones de compra/venta (Anti-Oracle Lock).
  2. Soberanía total del trader (El operador es el general; AEON es el estado mayor).
  3. Grounding matemático y determinista (Cero alucinaciones, $0 tokens para validaciones críticas).

## 2. Mapa de Módulos Activos (Qué hace, Por qué existe y Dónde vive)
| Módulo | Propósito | Decisión & Fecha | Estado | Archivos Clave |
|---|---|---|:---:|---|
| **Autonomous Engine** | Ingesta batch 17 activos, DXY oficial, noticias con grounding y macro liquidity. | 08-Sep-2026 (Eliminación cron jobs GitHub) | Activo (VPS / Local) | `scripts/ai/aeon_autonomous_engine.py` |
| **Active Copilot Sentinel** | Centinela 24/7 de microestructura (ZAP, BSL/SSL, dPOC). Cooldown atómico 15m. | 13-Sep-2026 (Hito MAS v1.1.0) | Activo (VPS) | `scripts/quant/harness_sentinel.py` |
| **MAS Orchestrator** | Fan-out < 1.2s, doble capa (microScore >= 25), guardrails regex anti-oráculo. | 13-Sep-2026 (Hito MAS v1.1.0) | Activo (Supabase Edge) | `supabase/functions/aeon-copilot-event/` |
| **AI Copilot & Scenarios** | Consultas en vivo, auditoría de precio propuesto con R:R crudo e invalidación. | 10-Sep-2026 (Hito 10 & MAS v1.1.0) | Activo (Supabase Edge) | `supabase/functions/aeon-chat/` |
| **AI Trader Journal** | Memoria conversacional, ratchet MFE/MAE de 20s en VPS, auditorías semanales. | 14-Sep-2026 (Hito MAS v1.2.0) | Activo (Harness) | `scripts/ai/trader_journal_harness.py`, `trader_journal` table |
| **Terminal de Análisis** | Interfaz de análisis con gráficos Canvas nativos (Lightweight Charts v5) y ZAPs. | 09-Sep-2026 (Hito 9) | Activo (Frontend) | `analisis.html`, `src/js/analysis.js` |
| **Macro Liquidity HUD** | Monitor en vivo de las 5 Joyitas de la Fed (US10Y, US02Y, EFFR, RRP, WALCL). | 11-Sep-2026 (Hito 20) | Activo (Frontend/DB) | `macroLiquidityHUD.js`, `macro_liquidity` table |

## 3. Registro de Decisiones de Arquitectura (ADR)
- **ADR-001 (13-Sep-2026):** Erradicación del paradigma de señales y transición a Terminal Cuantitativa.
- **ADR-002 (13-Sep-2026):** Cancelación de Fase 4 (MT5 / Brokers / TradingView externo) para blindar el activo web soberano.
- **ADR-003 (14-Sep-2026):** Arquitectura Zero-Trust RLS para el AI Trader Journal (escritura exclusiva service_role).
- **ADR-004 (14-Sep-2026):** Separación de responsabilidades MFE/MAE: Ratchet continuo de 20s en VPS a costo $0 vs cierre conversacional soberano por el usuario.

## 4. Guía de Navegación Documental (Los 7 Documentos)
- Explicación concisa del rol de cada uno de los 7 documentos vigentes y regla para mover documentos antiguos a `docs/archive/`.
```

---

## 4. Dudas Abiertas para Revisión con el Arquitecto (Claude & Moisés)

Conforme a la regla de no asumir ni decidir por cuenta propia, se elevan las siguientes preguntas abiertas:

1. **Estrategia para la sección oculta `#senales` de `index.html`:**
   - ¿Se elimina por completo el bloque HTML junto con `signals.css`, `signalService.js` y las 80+ líneas asociadas en `main.js`? *(Nuestra recomendación técnica: Sí, 🔴 Eliminar por completo. Ahorra 2 peticiones de red en cada visita y elimina ~600 líneas de código muerto).*
2. **Estrategia para las tablas huérfanas `signals` y `signals_pro_data` en Supabase:**
   - Dado que ningún motor escribe en ellas, ¿se autoriza una migración SQL en Fase 2 con `DROP TABLE` (o backup export previo + drop), junto con el retiro de la RPC `get_track_record_summary()`?
3. **Estrategia para el renombramiento de `trading_signal_events`:**
   - La tabla está en producción activa con el Centinela y el Chat. Si se renombra a `market_structural_events`:
     - *Opción A:* `ALTER TABLE trading_signal_events RENAME TO market_structural_events;` creando una vista `CREATE VIEW trading_signal_events AS SELECT * FROM market_structural_events;` para cero downtime y migración suave de clientes.
     - *Opción B:* Mantener el nombre físico en base de datos temporalmente y actualizar únicamente la documentación y constantes de código para no alterar contratos de Realtime.
4. **Destino de los archivos MT5 descartados (`trade_watcher_daemon.py`, `data_provider.py` con `MT5ExnessProvider`):**
   - ¿Se mueven a una subcarpeta `scripts/archive/` para preservar el historial de investigación, o se eliminan del árbol principal de scripts?

---

## 5. Próximos Pasos Propuestos (Pendiente de Aprobación Formal)

> [!IMPORTANT]
> Esta sección es una **propuesta de fases de trabajo**. No constituye un plan de ejecución autorizado ni habilita ninguna acción sobre el código hasta que Moises y Claude revisen el presente informe.

### Fase 1: Saneamiento de Frontend & Purga de Dead Code en UI
- **Objetivo:** Limpiar la interfaz, eliminar peticiones de red muertas y pulir copys legales.
- **Acciones:**
  1. Eliminar la sección oculta `#senales` de `index.html` y desvincular `signals.css`.
  2. Eliminar `src/css/components/signals.css` y `src/js/templates/signal.js`.
  3. Eliminar `src/js/services/signalService.js`.
  4. Limpiar `src/js/main.js` (remover imports, variables `activeSignals`, función `loadSignals` y suscripción realtime de señales).
  5. Limpiar `src/js/render.js` (remover `renderSignals`, `renderSignalHistory`, `renderKPIBar`).
  6. Actualizar copys en `aviso-legal.html` y `cookies.html`.
  7. Verificar build de Vite (`npm run build`).

### Fase 2: Deprecación en Backend, Base de Datos y Scripts Legados
- **Objetivo:** Alinear el esquema de Supabase y scripts auxiliares con la realidad cuantitativa.
- **Acciones:**
  1. Generar migración SQL de retiro o archivo de tablas huérfanas `signals` y `signals_pro_data`, y de la RPC `get_track_record_summary`.
  2. Aplicar estrategia acordada sobre `trading_signal_events` (renombrar o crear alias view).
  3. Archivar o limpiar `scripts/quant/trade_watcher_daemon.py`, `scripts/quant/data_provider.py` (componentes MT5) y scripts viejos `scripts/cleanup_4d.mjs`, `scripts/test_join.mjs`.
  4. Actualizar `deploy/docker-compose.yml` para reflejar el motor autónomo real.

### Fase 3: Reorganización Documental & Creación de `docs/INDEX.md`
- **Objetivo:** Documentación autosuficiente, coherente y libre de contradicciones.
- **Acciones:**
  1. Subsanar las duplicaciones de la Sección 3 y Errores 1-3 en `AEON_CHANGELOG_BITACORA.md`.
  2. Actualizar el diagrama de arquitectura y máquina de estados en `CURRENT_STATE_VS_TARGET.md` (retirando MT5/ZeroMQ y ciclo de señales).
  3. Alinear el lenguaje en `ENGINEERING_STANDARDS.md` y `CONVENTIONS.md`.
  4. Corregir la referencia rota a `harness_orchestrator.py` en `GUIA_HARNESS_ENGINEERING.md`.
  5. Redactar e incorporar el nuevo índice maestro `docs/INDEX.md`.

---
*Fin del informe de análisis Fase 0. Queda a la espera de la revisión estratégica entre Moises y el Arquitecto Técnico.*
