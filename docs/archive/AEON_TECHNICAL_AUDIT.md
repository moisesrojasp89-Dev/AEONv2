# AEON — Technical Architecture, Trade Watcher & Data Decoupling Audit

**Documento:** `docs/AEON_TECHNICAL_AUDIT.md`  
**Estado:** Pre-Producción / Auditoría Técnica de Arquitectura  
**Versión:** 1.0  
**Fecha de Ejecución:** 25 de Agosto de 2026  
**Directriz Obligatoria:** `docs/AEON_TECHNICAL_AUDIT_MANDATE.md`  
**Rol del Auditor:** Adversarial Technical Reviewer  

---

## 1. Resumen Ejecutivo y Diagnóstico Arquitectónico

El análisis técnico profundo del repositorio **AEON** confirma que la plataforma cuenta con una base de interfaz de usuario de alto rendimiento construida en Vanilla JS (ES Modules) y Vite, pero presenta **acoplamientos rígidos a nivel de proveedor de datos (OANDA), lógica analítica/matemática ejecutada indebidamente en el cliente, falta de normalización de modelos de mercado, fragilidad en la orquestación temporal (GitHub Actions) e inconsistencias en la máquina de estados del Trade Watcher**.

### Matriz de Diagnóstico Técnico

| Componente / Capa | Estado Auditado | Nivel de Riesgo | Dictamen Técnico |
|---|:---:|:---:|:---:|
| **Separación de Capas (Frontend/DB/Bot)** | Lógica analítica crítica (Track Record, Beat/Miss) en cliente | **ALTO** | ⚠️ Requiere migración a Postgres / Backend |
| **Abstracción de Datos (DataProvider)** | Hardcoded a endpoints e instrumentos específicos de OANDA | **ALTO** | ❌ Bloquea migración a MT5/Exness |
| **Trade Watcher & Máquina de Estados** | Inconsistencia de estados (`constants.js` vs `signal.js`) | **ALTO** | ⚠️ Riesgo de desincronización de trades |
| **Idempotencia y Recuperación** | Dependencia de polling efímero sin locks ni reconciliación | **CRÍTICO** | ❌ Vulnerable a caídas y gaps de mercado |
| **Orquestación (GitHub Actions vs VPS)** | Crons con latencia de 3–15 min en runners compartidos | **CRÍTICO** | ❌ Inviable para day trading M5/M15 en prod |
| **Observabilidad y Telemetría** | Ausencia de logs estructurados y correlación de órdenes | **MEDIO** | ⚠️ Falta trazabilidad forense |

---

## 2. Contraste: Documentación vs. Código Real en el Repositorio

| Afirmación en Documentación (`CURRENT_STATE_VS_TARGET.md` / `MASTER_PLAN`) | Realidad en el Código del Repositorio | Veredicto Técnico |
|---|---|:---:|
| *"Sprint 3.6 & 4.3: Bot Autónomo (`Aeon_Bot`) con Trade Watcher Lifecycle y detector ADX 100% COMPLETADO"* | Los scripts de `Aeon_Bot` y los workflows de GitHub Actions fueron eliminados del repositorio frontend (commit `00f17b0`). No hay código de ejecución en el repo para auditar directamente la máquina de estados en ejecución. | ⚠️ **Desacople físico no documentado** |
| *"Gestión de estados unificada: ACTIVE ➔ HIT_TP1 ➔ CLOSED_TP / CLOSED_BE / CLOSED_SL"* | `src/js/config/constants.js` define `SIGNAL_STATUS = { ACTIVE, WON, LOST, CANCELLED }`, mientras `src/js/templates/signal.js` maneja `hit_tp1, closed_tp, closed_be, closed_sl`. | ❌ **Inconsistencia de tipos y constantes** |
| *"Desacoplamiento de proveedores de datos preparado para producción"* | `marketService.js`, `chart.js` y `supabase/functions/oanda/index.ts` usan nomenclatura y endpoints exclusivos de OANDA (`XAU_USD`, `api-fxpractice.oanda.com`). | ❌ **Acoplamiento rígido a OANDA** |
| *"Track Record y Métricas Institucionales auditadas"* | Las métricas de Win Rate, Profit Factor y Net R se calculan en el navegador del cliente sobre un array limitado a 50 registros (`fetchSignalHistory(50)`). | ❌ **Cálculo sesgado y degradable en cliente** |

---

## 3. Auditoría de Arquitectura y Separación de Responsabilidades

```text
ARQUITECTURA ACTUAL (Con fugas de responsabilidad):
┌────────────────────────────────────────────────────────────────────────┐
│ CLIENTE (Vite / Browser)                                               │
│  - Calcula Win Rate, Profit Factor, Net R (calculateTrackRecordMetrics)│
│  - Evalúa señales Beat / Miss del calendario (parseEcoValue)           │
│  - Define fallbacks numéricos sintéticos de SL/TP si faltan            │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │ (Queries públicas)             │ (Invocación directa)
┌───────────────────┴────────────────┐   ┌───────────┴───────────────────┐
│ Supabase PostgreSQL                │   │ Edge Functions (OANDA proxy)  │
│  - signals (pública)               │   │  - Nomenclatura OANDA fijada  │
│  - signals_pro_data (privada)      │   └───────────────────────────────┘
└───────────────────▲────────────────┘
                    │
┌───────────────────┴────────────────────────────────────────────────────┐
│ MOTOR CUANTITATIVO EXTERNO (Aeon_Bot / GitHub Actions)                 │
│  - Ejecución en cron desfasado (latencia no determinista)              │
│  - Falta de modelo de datos normalizado hacia múltiples brokers        │
└────────────────────────────────────────────────────────────────────────┘
```

### Problemas Estructurales Detectados:
1. **Computación de KPIs en el Frontend:** En `src/js/services/signalService.js` (líneas 72–137), la función `calculateTrackRecordMetrics` procesa arrays locales en memoria. Si el historial crece a miles de registros, la carga de red será excesiva o, al limitarse a 50 elementos (`limit(50)`), el Track Record mostrado en el panel será **estadísticamente inválido** y sesgado a la muestra reciente.
2. **Lógica de Señales Macro en el Cliente:** En `src/js/templates/calendarItem.js` (líneas 74–87), la evaluación de sorpresas económicas (`beat` vs. `miss`) y la inversión de indicadores (desempleo) se calcula mediante manipulación de strings en el DOM. Debe ser computada por el agente macro en backend y persistida en `economic_calendar.directional_signal`.
3. **Hardcoded Fallbacks de Precios:** `src/js/templates/signal.js` (líneas 296–298) contiene precios hardcodeados (`2650.50`, `1.08520`) como fallback para renderizado si faltan niveles. Esto induce a error al usuario si el feed falla.

---

## 4. Desacoplamiento de OANDA hacia la Abstracción DataProvider (MT5 / Exness)

### El Problema del Acoplamiento Actual
Actualmente, el sistema está fuertemente acoplado a la API REST v3 de OANDA:
* Nombres de instrumentos de OANDA: `EUR_USD`, `XAU_USD`, `SPX500_USD`, `NAS100_USD`, `US30_USD`.
* La Edge Function `supabase/functions/oanda/index.ts` consume directamente `api-fxpractice.oanda.com` y parsea arrays específicos de OANDA (`mid.c`, `closeoutAsk`).
* El frontend (`chart.js`, `prices.js`, `marketService.js`) invoca la función `'oanda'` por nombre específico.

### Arquitectura Target: Capa de Abstracción Universal de Mercado
Para permitir que AEON opere en producción sobre VPS con MetaTrader 5 (Exness) o cualquier otro broker institucional sin alterar el motor de estrategias ni el frontend, se debe implementar una interfaz unificada:

```text
                           ┌───────────────────────────┐
                           │   AEON Strategy Engine    │
                           │ (Volume Profile/VWAP/ADX) │
                           └─────────────▲─────────────┘
                                         │
                                         │ Consume modelo normalizado
                                         │
                           ┌─────────────┴─────────────┐
                           │   NormalizedMarketData    │
                           │ (OHLCV, Bid, Ask, Spread) │
                           └─────────────▲─────────────┘
                                         │
                       ┌─────────────────┴─────────────────┐
                       │      DataProvider (Interface)     │
                       └─────────────────▲─────────────────┘
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             │                           │                           │
┌────────────┴────────────┐ ┌────────────┴────────────┐ ┌────────────┴────────────┐
│    OandaDataProvider    │ │    MT5ExnessProvider    │ │   HistoricalCsvProvider │
│   (Desarrollo / Demo)   │ │  (Producción VPS Live)  │ │   (Backtest Research)   │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

#### Especificación del Modelo de Datos Normalizado (`MarketCandle` & `MarketTicker`)
```typescript
interface NormalizedTicker {
  symbol: StandardAsset;      // 'XAUUSD' | 'EURUSD' | 'US500' | 'USTEC' | 'US30' | 'BTCUSD'
  bid: number;
  ask: number;
  mid: number;
  spreadPips: number;
  sessionChangePct: number;
  timestamp: string;          // ISO 8601 UTC
  provider: 'OANDA' | 'EXNESS_MT5' | 'COINGECKO';
}

interface NormalizedCandle {
  symbol: StandardAsset;
  timeframe: 'M1' | 'M5' | 'M15' | 'H1' | 'D1';
  time: number;               // Unix Timestamp (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;             // Real volume or tick volume
}
```

---

## 5. Auditoría de la Máquina de Estados del Trade Watcher

### Ciclo de Vida Requerido vs. Implementado
El ciclo de vida institucional para operaciones intradía M5/M15 de AEON debe cumplir la siguiente máquina de estados determinista:

```text
                  [ 1. CREATED / PENDING ]
                             │
                             │ (Precio cruza nivel de entrada)
                             ▼
                        [ 2. ACTIVE ]
                       (SL inicial a -1.0R)
                             │
             ┌───────────────┴───────────────┐
             │ (Precio toca TP1 / +1.5R)     │ (Precio toca SL / -1.0R)
             ▼                               ▼
       [ 3. HIT_TP1 ]                  [ CLOSED_SL ]
    (Stop ajustado a BE: 0.0R)          (Loss: -1.0R)
             │
     ┌───────┴───────┐
     │ (Precio >= TP)│ (Precio retrocede a BE)
     ▼               ▼
[ CLOSED_TP ]   [ CLOSED_BE ]
 (+R target)     (0.0R neutral)
```

### Puntos Críticos de Fallo Detectados:
1. **Colisión de Nomenclatura de Estados:**  
   * `src/js/config/constants.js` declara: `ACTIVE, WON, LOST, CANCELLED`.
   * `src/js/templates/signal.js` y `services/signalService.js` procesan: `active, hit_tp1, closed_tp, closed_be, closed_sl, won, lost`.
   * **Riesgo:** Si el backend actualiza una señal a `closed_be`, módulos que consultan `constants.js` no reconocerán el estado y marcarán la señal como desconocida o la omitirán del Track Record.
2. **Ausencia de Locks Optimistas / Control de Concurrencia:**  
   Si múltiples instancias del bot o invocaciones concurrentes evalúan la misma señal activa, pueden ocurrir transiciones cruzadas (ej. procesar `CLOSED_SL` después de que ya se había confirmado `HIT_TP1` y movido a Break-Even).
3. **Falta de Trazabilidad Temporal de Transición:**  
   La base de datos debe almacenar formalmente las marcas de tiempo de cada fase (`opened_at`, `hit_tp1_at`, `closed_at`, `exit_price`, `exit_reason`, `realized_r`) para permitir auditorías cuantitativas post-trade.

---

## 6. Orquestación, Observabilidad y Resiliencia (GitHub Actions vs. VPS)

### Evaluación Crítica de GitHub Actions en Fase Cuantitativa
El uso de GitHub Actions programados por cron (`.github/workflows`) para monitorear órdenes y señales activas en timeframes M5 y M15 presenta **deficiencias operativas no mitigables para producción**:

| Factor Operativo | Comportamiento en GitHub Actions | Requerimiento en VPS Producción (Target) |
|---|---|---|
| **Puntualidad del Cron** | Retrasos de **3 a 15 minutos** en horas pico de GitHub | Ejecución continua con loop determinista (100–500ms) |
| **Persistencia de Conexión** | Conexiones efímeras (arranque en frío de runner 30-60s) | Conexión WebSocket / IPC persistente con MT5 terminal |
| **Bloqueos de IP / Rate Limits** | IPs públicas de Azure compartidas (bloqueos frecuentes) | IP fija dedicada con whitelist en broker |
| **Manejo de Spikes Rápidos** | Si el precio toca TP1 y se devuelve a SL en <5 min, el cron no lo ve | Monitoreo tick-a-tick en tiempo real |
| **Recuperación ante Caídas** | Si el workflow falla, la señal queda huérfana hasta el siguiente ciclo | `systemd` / Docker auto-restart con reconciliación inmediata |

---

## 7. Registro de Hallazgos Técnicos Estructurales

---

### [CRÍTICO] TECH-01: Inviabilidad de GitHub Actions para el Trade Watcher en Timeframes M5/M15

1. **Problema identificado:**  
   La ejecución del Trade Watcher mediante disparos periódicos de GitHub Actions cron no garantiza latencia determinista ni monitoreo continuo. Los eventos de mercado en velas de 5 y 15 minutos (noticias de alto impacto, expansiones de volatilidad) ocurren en segundos.

2. **Impacto en el sistema:**  
   Pérdida de eventos de Break-Even (`HIT_TP1`). Una posición ganadora que toque TP1 y retroceda a la entrada será registrada erróneamente como pérdida (`CLOSED_SL`) si el cron no estuvo ejecutándose en el segundo exacto del toque.

3. **Evidencia en el código:**  
   * `docs/CURRENT_STATE_VS_TARGET.md` (Línea 29): Especifica ráfaga de 3 disparos por cron (:01, :03, :06), evidenciando el intento de mitigar la falta de ejecución continua.

4. **Alternativas evaluadas:**  
   * *Alternativa A (Inviable):* Aumentar la frecuencia de crons en GitHub Actions (GitHub no permite crons con frecuencia menor a 5 minutos y penaliza el abuso de runners).
   * *Alternativa B (Correcta):* Migrar el motor `Aeon_Bot` y el `TradeWatcher` a un VPS Linux (Ubuntu 24.04 LTS / Docker) con proceso `daemon` 24/7 conectado permanentemente a MT5 / Exness.

5. **Recomendación técnica:**  
   * Confinar GitHub Actions exclusivamente a tareas de CI/CD (pruebas automatizadas, linters, despliegue de frontend y Edge Functions).
   * Desplegar el motor en VPS con `systemd` o Docker Compose, implementando un bucle de eventos (`asyncio`) que procese ticks en tiempo real.

6. **Riesgo de no implementarlo:**  
   Distorsión grave del Track Record real vs. teórico y fallos en la protección de capital de usuarios PRO.

7. **Archivos afectados:**  
   * `.github/workflows/`
   * `Aeon_Bot` (Arquitectura de despliegue)

8. **Criterios de aceptación:**  
   * El Trade Watcher corre como servicio daemon en VPS con latencia de procesamiento de ticks < 1000ms.

---

### [ALTO] TECH-02: Acoplamiento Rígido del Frontend y Backend al Proveedor OANDA

1. **Problema identificado:**  
   El cliente y las Edge Functions asumen de forma estática la estructura de datos, nomenclatura de pares (`EUR_USD`) y endpoints de la API de OANDA. No existe un adaptador intermedio que permita cambiar la fuente a MetaTrader 5 / Exness.

2. **Impacto en el sistema:**  
   Cualquier cambio de broker o proveedor de liquidez obligará a refactorizar múltiples archivos en el frontend (`chart.js`, `prices.js`, `marketService.js`, `constants.js`) y romperá los contratos de datos del terminal.

3. **Evidencia en el código:**  
   * `src/js/config/constants.js` (Línea 33): `OANDA_DEFAULT_INSTRUMENTS: ['EUR_USD', 'XAU_USD', 'SPX500_USD', 'NAS100_USD', 'US30_USD']`.
   * `src/js/services/marketService.js` (Línea 28): Invocación directa a `supabase.functions.invoke('oanda')`.
   * `supabase/functions/oanda/index.ts`: Conexión directa a `api-fxpractice.oanda.com`.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Crear una segunda función `exness` y duplicar llamadas en frontend. (Incrementa deuda técnica).
   * *Alternativa B (Correcta):* Estandarizar la Edge Function como `/market-data` o `/pricing` con un contrato normalizado (`NormalizedTicker`), desacoplando el proveedor subyacente.

5. **Recomendación técnica:**  
   * Crear la interfaz `DataProvider` en el backend Python y consolidar la Edge Function en un endpoint neutro `market-prices` que consuma la base de datos o el broker activo.
   * Utilizar símbolos institucionales canónicos (`XAUUSD`, `EURUSD`, `SPX500`) en todo el frontend.

6. **Riesgo de no implementarlo:**  
   Bloqueo técnico de la Fase 3 y 4 del Roadmap para la integración de Exness en producción.

7. **Archivos afectados:**  
   * `src/js/config/constants.js`
   * `src/js/services/marketService.js`
   * `src/js/chart.js`
   * `supabase/functions/oanda/index.ts`

8. **Criterios de aceptación:**  
   * El frontend no contiene referencias a la palabra `oanda` ni URLs de brokers específicos.
   * Cambiar el backend de OANDA a Exness requiere 0 cambios en el código de la UI.

---

### [ALTO] TECH-03: Inconsistencia y Falta de Idempotencia en la Máquina de Estados del Trade Watcher

1. **Problema identificado:**  
   Existe desalineación en los estados reconocidos por el sistema. `constants.js` sólo contempla 4 estados (`ACTIVE`, `WON`, `LOST`, `CANCELLED`), mientras que el servicio de señales y las plantillas esperan estados del Trade Watcher adaptativo (`hit_tp1`, `closed_tp`, `closed_be`, `closed_sl`). Además, no hay control de concurrencia optimista en las transiciones de estado.

2. **Impacto en el sistema:**  
   * Fallos silenciosos al filtrar señales cerradas.
   * Posibilidad de que una señal pase de `closed_be` a `closed_sl` si el bot reinicia y lee un precio viejo de caché.

3. **Evidencia en el código:**  
   * `src/js/config/constants.js` (Líneas 45–50) vs `src/js/templates/signal.js` (Líneas 7–35).
   * `src/js/services/signalService.js` (Líneas 58, 73): Filtros hardcodeados con strings dispersos: `['closed_tp', 'closed_be', 'closed_sl', 'won', 'lost']`.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Mantener strings libres en el código. (Propenso a bugs tipográficos).
   * *Alternativa B (Correcta):* Centralizar el Enum canónico de estados en `constants.js` y hacer que base de datos, backend y frontend consuman exactamente las mismas claves tipadas.

5. **Recomendación técnica:**  
   * Actualizar `src/js/config/constants.js`:
   ```javascript
   export const SIGNAL_STATUS = {
     PENDING: 'pending',
     ACTIVE: 'active',
     HIT_TP1: 'hit_tp1',
     CLOSED_TP: 'closed_tp',
     CLOSED_BE: 'closed_be',
     CLOSED_SL: 'closed_sl',
     CANCELLED: 'cancelled',
   };
   ```
   * En PostgreSQL, crear un tipo ENUM estricto:
   ```sql
   CREATE TYPE signal_status_enum AS ENUM (
     'pending', 'active', 'hit_tp1', 'closed_tp', 'closed_be', 'closed_sl', 'cancelled'
   );
   ALTER TABLE public.signals ALTER COLUMN status TYPE signal_status_enum USING status::signal_status_enum;
   ```

6. **Riesgo de no implementarlo:**  
   Inconsistencia de datos, métricas erróneas en el Track Record y comportamientos impredecibles en la UI.

7. **Archivos afectados:**  
   * `src/js/config/constants.js`
   * `src/js/services/signalService.js`
   * `src/js/templates/signal.js`
   * Esquema de PostgreSQL (`public.signals`)

8. **Criterios de aceptación:**  
   * 100% de las referencias a estados de señales usan el Enum centralizado `SIGNAL_STATUS`.
   * PostgreSQL rechaza inserciones de estados no tipados.

---

### [ALTO] TECH-04: Computación Insegura y No Escalable del Track Record en el Cliente

1. **Problema identificado:**  
   El cálculo de Win Rate, Profit Factor, R Promedio y R Neto total se ejecuta en el navegador del usuario en `src/js/services/signalService.js` (`calculateTrackRecordMetrics`). Además, la consulta de datos se limita arbitrariamente a los últimos 50 trades (`fetchSignalHistory(50)`).

2. **Impacto en el sistema:**  
   * **Invalidez Estadística:** El KPI Bar del Track Record sólo refleja los últimos 50 trades, no el rendimiento histórico real auditado de la plataforma.
   * **Sobrecarga de CPU/Red:** A medida que la muestra crezca, descargar miles de registros para calcular sumas en JavaScript ralentizará el navegador del cliente.

3. **Evidencia en el código:**  
   * `src/js/services/signalService.js` (Líneas 54, 72–137):
   ```javascript
   export async function fetchSignalHistory(limit = 50) { ... }
   export function calculateTrackRecordMetrics(signals = []) { ... }
   ```
   * `src/js/main.js` (Líneas 56–60): Invocación del cálculo en tiempo de renderizado UI.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Aumentar el límite a 500 o 1000 en el select. (Empeora el problema de rendimiento en móviles).
   * *Alternativa B (Correcta):* Crear una Vista Materializada o Función RPC en PostgreSQL (`get_track_record_metrics()`) que devuelva el resumen matemático precalculado en 1 fila JSON de 0.1 KB.

5. **Recomendación técnica:**  
   Implementar la función de agregación en PostgreSQL:
   ```sql
   CREATE OR REPLACE FUNCTION get_track_record_summary()
   RETURNS json AS $$
   DECLARE
     result json;
   BEGIN
     SELECT json_build_object(
       'total_trades', COUNT(*),
       'won_count', COUNT(*) FILTER (WHERE status = 'closed_tp'),
       'be_count', COUNT(*) FILTER (WHERE status = 'closed_be'),
       'lost_count', COUNT(*) FILTER (WHERE status = 'closed_sl'),
       'win_rate', ROUND((COUNT(*) FILTER (WHERE status = 'closed_tp')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('closed_tp', 'closed_sl')), 0) * 100), 1),
       'profit_factor', ROUND((COALESCE(SUM(confluences->>'realized_r'::numeric) FILTER (WHERE (confluences->>'realized_r')::numeric > 0), 0) / NULLIF(ABS(SUM(confluences->>'realized_r'::numeric) FILTER (WHERE (confluences->>'realized_r')::numeric < 0)), 0)), 2),
       'total_net_r', ROUND(COALESCE(SUM((confluences->>'realized_r')::numeric), 0), 1)
     ) INTO result
     FROM public.signals
     WHERE status IN ('closed_tp', 'closed_be', 'closed_sl');

     RETURN result;
   END;
   $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
   ```

6. **Riesgo de no implementarlo:**  
   Degradación del rendimiento web y exposición de métricas sesgadas a inversores y clientes potenciales.

7. **Archivos afectados:**  
   * `src/js/services/signalService.js`
   * `src/js/main.js`
   * `supabase/migrations/`

8. **Criterios de aceptación:**  
   * El cliente realiza una única llamada `rpc('get_track_record_summary')` con tiempo de respuesta < 50ms.
   * La UI muestra métricas sobre el 100% de los trades cerrados históricos, sin límite artificial de 50.

---

### [MEDIO] TECH-05: Ausencia de Logging Estructurado y Trazabilidad Forense de Señales

1. **Problema identificado:**  
   No existe un sistema de logging estructurado con correlation IDs (`trade_id`, `signal_key`, `bar_timestamp`). Los errores en Edge Functions y frontend se imprimen con `console.error` o `console.warn` planos sin contexto estructurado.

2. **Impacto en el sistema:**  
   Imposibilidad de realizar análisis post-mortem ante fallos en la ejecución de órdenes, descalces de precios o disputas con usuarios sobre el estado de una señal.

3. **Evidencia en el código:**  
   * `src/js/services/signalService.js` (Líneas 33, 84): `console.warn('[signalService] Pro query notice:', proErr)`.
   * `supabase/functions/oanda/index.ts` (Línea 79): `console.error('OANDA Pricing Error:', errorText)`.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Continuar con `console.log` estándar. (Insuficiente para auditoría fintech).
   * *Alternativa B (Correcta):* Implementar un logger estructurado en formato JSON con niveles (`INFO`, `WARN`, `ERROR`, `AUDIT`) y campos canónicos (`event_type`, `entity_id`, `duration_ms`, `timestamp_utc`).

5. **Recomendación técnica:**  
   * Estandarizar el formato de logs en backend y Edge Functions.
   * Crear una tabla de auditoría en PostgreSQL (`audit_logs`) para registrar transiciones de estado críticas de trades.

6. **Riesgo de no implementarlo:**  
   Falta de observabilidad en incidentes operativos de producción.

7. **Archivos afectados:**  
   * `supabase/functions/`
   * `Aeon_Bot`

8. **Criterios de aceptación:**  
   * Todos los logs críticos contienen `timestamp_utc`, `signal_id` y `event_type`.

---

## 8. Arquitectura Target de Producción Recomendada

```text
PRODUCCIÓN TARGET (24/7 VPS + MetaTrader 5 / Exness):
┌────────────────────────────────────────────────────────────────────────┐
│ VPS HOST LINUX (Ubuntu 24.04 LTS / Docker Compose / systemd)           │
│                                                                        │
│  ┌──────────────────────┐         ┌─────────────────────────────────┐  │
│  │ MetaTrader 5 Engine  │◄───────►│ Quant Strategy & Trade Watcher  │  │
│  │ (Exness Zero/Raw API)│ (ZeroMQ/│ (Python asyncio + VolumeProfile)│  │
│  └──────────────────────┘   IPC)  └────────────────┬────────────────┘  │
└────────────────────────────────────────────────────┼───────────────────┘
                                                     │
                                                     │ Sincronización Segura
                                                     │ (Service Role Key)
                                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL & BACKEND                                          │
│  - RLS estricto en signals_pro_data                                    │
│  - RPC get_track_record_summary() (Agregaciones instantáneas)          │
│  - WebSockets Realtime con REPLICA IDENTITY FULL                       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     │ JSON público y niveles PRO
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL (Frontend Vite SPA)                                      │
│  - 0ms white-screen con cache local                                    │
│  - Consume símbolos canónicos (XAUUSD, EURUSD, US500)                  │
│  - Zero business logic en navegador                                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Checklist de Aprobación Técnica (Go / No-Go para Fase 1)

- [ ] **[NO-GO]** ¿Se eliminó la computación matemática del Track Record del frontend?
- [ ] **[NO-GO]** ¿Se unificó el Enum de estados de señales (`SIGNAL_STATUS`) en frontend, base de datos y bot?
- [ ] **[NO-GO]** ¿Se reemplazaron los endpoints específicos de OANDA por la interfaz neutral `DataProvider`?
- [ ] **[NO-GO]** ¿Se descartó GitHub Actions como motor del Trade Watcher para producción en favor del VPS 24/7?
- [ ] **[GO]** ¿Está definida la función RPC de agregación del Track Record en PostgreSQL?
- [ ] **[GO]** ¿Están documentados los modelos normalizados `NormalizedTicker` y `NormalizedCandle`?

---

> **Fin del Informe de Auditoría Técnica y Desacoplamiento.**  
> Cumple estrictamente con `docs/AEON_TECHNICAL_AUDIT_MANDATE.md`.  
> No se ha modificado ningún archivo de código de la aplicación.
