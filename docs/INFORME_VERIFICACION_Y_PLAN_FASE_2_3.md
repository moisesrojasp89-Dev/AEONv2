# 📑 AEON — Informe de Certificación en Producción (Vercel), Auditoría Forense de `Aeon_Bot` y Plan de Ingeniería para Fases 2 y 3

**Para:** Arquitecto Técnico (Claude) & Equipo Directivo  
**De:** Asistente de Ingeniería de Software (Antigravity)  
**Fecha:** 15 de Septiembre de 2026  
**Estado:** Fase 1 Certificada en Producción | Gating de Seguridad Cumplido | Pendiente de Aprobación para Fases 2 y 3  

---

## Resumen Ejecutivo

Conforme a las directrices de rigor metodológico y gating establecidas por el Arquitecto Técnico:
1. **La Fase 1 (Frontend & Fuga de Datos)** fue desplegada en producción en `https://aeondev.vercel.app` (commit `3fd1f46`). Se certificó empíricamente mediante navegador real (**Playwright Headless Edge**) la eliminación del 100% de las peticiones fantasmas de SL/TP y la integridad absoluta de los componentes visuales.
2. **El repositorio externo `Aeon_Bot`** fue localizado en `C:\Users\indatech\Desktop\Aeon_Bot` y sometido a auditoría forense estática. Se confirmó que el bot generador de señales está **inactivo**, que las alertas de Telegram operan de forma independiente y nativa desde Supabase vía `pg_net`, y que la arquitectura cuántica activa reside en su totalidad en `AEONv2`.
3. **Se presenta el Plan de Implementación Formal para las Fases 2 y 3**, detallando el procedimiento de respaldo previo (`pg_dump`), la migración DDL, el archivado seguro de MT5 (sin borrado) y el saneamiento integral de la documentación y bitácora técnica.

---

# PARTE 1: Certificación Empírica de Producción (Vercel)

El commit `3fd1f46` fue publicado a la rama `main` de GitHub y desplegado de forma automática por la infraestructura CI/CD de Vercel.

### 1.1 Ficha Técnica del Despliegue
* **URL de Producción:** `https://aeondev.vercel.app`
* **Commit Hash:** `3fd1f46` (`feat(cleanup): purga de frontend de senales y eliminacion de fuga de red (Fase 1)`)
* **Timestamp de Despliegue Vercel:** 15-Sep-2026 22:23:14 UTC
* **Tamaño del Bundle Servido (`dist/index.html`):** 11.84 kB (reducción desde ~15.1 kB iniciales, -21.6% de carga inicial)
* **Presencia de `#senales` o `signals.css` en HTML crudo:** **0 coincidencias**.

### 1.2 Auditoría de Red con Navegador Real (Playwright Headless Edge)
Para garantizar que ningún usuario real continúe recibiendo datos privados de Stop Loss / Take Profit en la pestaña Network de DevTools, se ejecutó un agente de prueba sobre la URL pública de producción inspeccionando 53 peticiones HTTP y eventos de WebSockets:

| Métrica de Red en Producción | Esperado | Observado en Vivo | Estado |
|---|:---:|:---:|:---:|
| Peticiones REST a `/rest/v1/signals` | 0 | **0** | ✅ Erradicado |
| Peticiones REST a `/rest/v1/signals_pro_data` | 0 | **0** | ✅ Erradicado |
| Conexiones WebSocket a `public:signals` | 0 | **0** | ✅ Erradicado |
| Peticiones con término `"signal"` | Solo Copilot | **2** (`/rest/v1/trading_signal_events`) | ✅ Autorizado |
| Canales WebSocket activos en vivo | Solo Contexto | `aeon_harness_alerts`, `daily_briefings`, `macro_liquidity_live_channel`, `market_intelligence_live_channel` | ✅ Nominal |

### 1.3 Verificación de Integridad del DOM de Componentes Vecinos
El motor de renderizado de Edge confirmó que los 5 módulos institucionales se encuentran plenamente operativos:

```json
{
  "index.html": {
    "briefing_card_container": true,
    "radar_macro_hud_root": true,
    "news_list": true,
    "education_grid": true,
    "premium_section": true,
    "section_senales_absent": true
  },
  "mercados.html": {
    "markets_grid": true,
    "macro_hud_root": true,
    "market_filters": true
  }
}
```

* **Evidencias Generadas en Disco:**
  - `live_production_vercel.png` (Captura fotográfica de la terminal en producción).
  - `production_network_log.json` (Volcado exhaustivo de las 53 peticiones HTTP).

---

# PARTE 2: Auditoría Forense del Repositorio `Aeon_Bot`

En cumplimiento del gating solicitado por el Arquitecto sobre el repositorio externo, se localizó y analizó el código fuente ubicado en `C:\Users\indatech\Desktop\Aeon_Bot`.

### 2.1 Hallazgos en el Código Fuente
El escaneo estático del repositorio arrojó **21 coincidencias directas** con las tablas legadas:
* **`delivery/supabase_client.py`:**
  - Línea 23: `requests.get(f"{base_url}/rest/v1/signals?{query}")`
  - Línea 99: `requests.post(f"{base_url}/rest/v1/signals", json=signal_data)`
  - Línea 138: `requests.post(f"{base_url}/rest/v1/signals_pro_data", json=pro_data)`
  - Línea 165: `requests.patch(f"{base_url}/rest/v1/signals?signal_key=eq.{signal_key}")`
* **`scheduler/watcher.py`:**
  - Líneas 46-47: Consulta SQL/REST con `JOIN` a `signals_pro_data` para auditar precios tick a tick contra TP1/SL.
  - Línea 74: `requests.patch(f"{base_url}/rest/v1/signals?id=eq.{signal_id}")`
* **Módulo `signals/`:**
  - Contiene generadores de gráficos (`chart.py`), estrategias de breakout (`forex_strategy.py`) y formateadores de mensajes de Telegram (`formatter.py`).

### 2.2 Desacoplamiento de las Alertas de Pago en Telegram
Existía la inquietud de si borrar las tablas de señales afectaría las notificaciones de pago en Telegram. La auditoría confirmó que **están totalmente desacopladas**:
* Las alertas de pago cuando un usuario adquiere una suscripción PRO se gestionan **de forma nativa dentro de Supabase**.
* Residen en la migración `supabase/migrations/00007_telegram_payment_alerts.sql`.
* Utilizan la extensión `pg_net` y un trigger (`trg_notify_telegram_payment`) sobre la tabla `public.payments`, despachando el mensaje directamente a la API oficial de Telegram (`api.telegram.org`). No requieren ni tocan `Aeon_Bot` ni las tablas `signals`.

### 2.3 Diagnóstico de Estado y Mitigación de Riesgo
* El usuario confirmó formalmente que **el bot generador de señales está apagado y no hay órdenes ejecutándose**.
* `Aeon_Bot` representa una iteración histórica (junio-agosto 2026).
* **Conclusión:** La eliminación de `signals` y `signals_pro_data` en Supabase no afectará ningún proceso activo de la organización, siempre que se ejecute el respaldo preventivo obligatorio.

### 2.4 Confirmación Mecánica de GitHub Actions en `Aeon_Bot`
Para no depender exclusivamente de confirmaciones verbales, se inspeccionó directamente el directorio `.github/workflows/` en `C:\Users\indatech\Desktop\Aeon_Bot`:
* **Hallazgo Técnico:** El archivo `.github/workflows/bot.yml` ("Silver Bullet Bot") contiene un disparador `on: schedule` con cron (`"0,15,30,45 10,11,14,15,18,19 * * 1-5"`).
* **Riesgo Identificado por el Arquitecto:** Si el workflow sigue activo en la pestaña Actions de GitHub en el repositorio `moisesrojasp89-Dev/AEON_BOT`, GitHub intentará despertar el runner en esos horarios y llamar a `publish_signal_to_supabase()`.
* **Solución Mecánica de Blindaje Obligatoria:**
  1. **En GitHub Web:** Navegar a `https://github.com/moisesrojasp89-Dev/AEON_BOT/actions/workflows/bot.yml`, hacer clic en los 3 puntos `...` y seleccionar **"Disable workflow"**.
  2. **Vía Git Local:** Renombrar el archivo `.github/workflows/bot.yml` a `bot.yml.disabled` en `C:\Users\indatech\Desktop\Aeon_Bot` y publicar el commit a GitHub (`git push`), garantizando de forma mecánica y rastreable que GitHub Actions jamás volverá a disparar el bot.

---

# PARTE 3: Plan de Implementación para Fase 2 (Base de Datos & Backend)

### 3.1 Gating Crítico de Respaldo Preventivo (Red de Seguridad)
Antes de ejecutar cualquier sentencia destructiva DDL:
1. Se generará un volcado estructurado de los esquemas y datos existentes:
   - Exportación de `signals` y `signals_pro_data` en formato JSON/CSV a través del CLI de Supabase o REST endpoint autenticado con `service_role`.
   - Almacenamiento seguro del archivo en `scripts/archive/backup_signals_pre_drop.json`.
2. Solo tras verificar que el archivo de respaldo existe y contiene los registros históricos, se habilitará la migración.

### 3.2 Migración SQL de Purga
* **Archivo:** `supabase/migrations/20260916000001_purge_legacy_signals_tables.sql`
* **Acciones:**
  ```sql
  -- 1. Eliminar la RPC huérfana get_track_record_summary()
  -- (Evita error 'relation does not exist' al invocar una función que consulta signals internamente)
  DROP FUNCTION IF EXISTS public.get_track_record_summary();

  -- 2. Revocar políticas de seguridad RLS obsoletas
  DROP POLICY IF EXISTS "Public signals are viewable by everyone" ON public.signals;
  DROP POLICY IF EXISTS "Pro data viewable by pro users" ON public.signals_pro_data;
  DROP POLICY IF EXISTS "Service role full access signals" ON public.signals;
  DROP POLICY IF EXISTS "Service role full access signals_pro_data" ON public.signals_pro_data;

  -- 3. Eliminación de índices secundarios
  DROP INDEX IF EXISTS public.idx_signals_status_time;
  DROP INDEX IF EXISTS public.idx_signals_pro_signal_id;

  -- 4. Eliminación segura en cascada
  DROP TABLE IF EXISTS public.signals_pro_data CASCADE;
  DROP TABLE IF EXISTS public.signals CASCADE;

  -- 5. Confirmación Semántica MAS v1.1.0 (Opción B)
  COMMENT ON TABLE public.trading_signal_events IS 
    'Bus de eventos contextuales y microestructura para el Centinela MAS y Copilot. Tabla física preservada para replicación lógica Realtime (Opción B).';
  ```

### 3.3 Saneamiento de Constantes en Frontend
* **Archivo:** `src/js/config/constants.js`
* **Acción:** Eliminar definitivamente las claves marcadas como deprecadas `DB_TABLES.SIGNALS` y `DB_TABLES.SIGNALS_PRO_DATA`.

### 3.4 Archivado Seguro de MT5 y Saneamiento de Docker (Backend)
Conforme a la instrucción estricta del Arquitecto (**ARCHIVAR, NUNCA BORRAR**):
1. **Crear directorio:** `scripts/archive/`.
2. **Crear `scripts/archive/README.md`:**
   - Documentar que `trade_watcher_daemon.py` y los conectores MT5 pertenecen al paradigma obsoleto de ejecución de órdenes y prop-firms, cancelado en MAS v1.1.0 en favor del modelo de Terminal Cuántica.
   - Advertencia de que estos scripts no deben montarse en producción.
3. **Mover archivo:**  
   `scripts/quant/trade_watcher_daemon.py` $\longrightarrow$ `scripts/archive/trade_watcher_daemon.py`.
4. **Aislar MT5 en `scripts/quant/data_provider.py`:**
   - Anotar `MT5ExnessProvider` como `@deprecated`. Asegurar que los proveedores activos (`OandaBatchProvider`, `BinanceDirectProvider`) no tengan dependencia de sockets de MT5.
5. **Limpiar `deploy/docker-compose.yml`:**
   - Remover el servicio `aeon-quant-daemon` (antiguo contenedor de `trade_watcher_daemon.py`).
   - Remover variables `MT5_SERVER_HOST` y `MT5_SERVER_PORT`.
   - Preservar los servicios esenciales de producción: `aeon-calendar-watcher` y `aeon-macro-ai`.

---

# PARTE 4: Plan de Implementación para Fase 3 (Documentación & Unificación)

### 4.1 Saneamiento Integral de `docs/AEON_CHANGELOG_BITACORA.md`
La auditoría detectó una colisión estructural en las cabeceras `H2`:
* **Problema 1 (Sección duplicada):** La sección `## 🐞 3. Registro de Errores Críticos...` (línea 105) y la sección `## 🧠 3. Evolución del Cerebro Cuántico...` (línea 176) comparten el mismo ordinal.
* **Problema 2 (Bugs repetidos):** En la sección de errores posterior (línea 205), los Errores 1, 2 y 3 (Vercel CI, Auto-reload de Vite y TwelveData 429) están repetidos en versión condensada respecto a la sección 3.
* **Solución Estructural:**
  - Renumerar ordenadamente las secciones del documento:
    - `1. Hitos de Arquitectura y Nuevas Generaciones`
    - `2. Refactorizaciones de Frontend y Experiencia de Usuario (UI/UX)`
    - `3. Evolución del Cerebro Cuántico y Agentes Autónomos (AEON Engine)`
    - `4. Registro Unificado de Errores Críticos (Bugs) y Malas Prácticas Resueltas` (fusionando las dos secciones de errores en una sola lista exhaustiva del Error 1 al Error 11 sin repeticiones).
    - `5. Buenas Prácticas y Protocolos para Futuras Actualizaciones`
    - `6. Hito 6: Terminal de Análisis Estructural y Desacoplamiento`
    - `7. Hito 7: Auditoría Forense y Reingeniería del Motor de Noticias`
    - `8. Hito 8: Purga Histórica de Señales, Erradicación de Fuga de Red y Consolidación MAS v1.1.0` (Nuevo capítulo registrando las Fases 1, 2 y 3).

### 4.2 Actualización de `docs/CURRENT_STATE_VS_TARGET.md`
1. **Eliminar Sección 2:** Remover la máquina de estados de señales (`[ PENDING ] -> [ ACTIVE ] -> [ HIT_TP1 ] -> [ CLOSED ]`).
2. **Actualizar Sección 4 (Diagrama de Arquitectura del VPS):**
   - Eliminar el bloque de `MetaTrader 5 (Exness ECN)` y el socket `ZeroMQ` (puerto 5555).
   - Reflejar la topología real de producción:
     - Motor Cuántico Autónomo (`aeon_autonomous_engine.py` / Ingesta Batch OANDA + Binance).
     - Centinela Cuántico MAS 24/7 (`harness_sentinel.py` / ZAP + BSL/SSL + Cooldown).
     - AI Trader Journal Ratchet (20s en memoria RAM sin sobrecosto de tokens).
     - Conexión HTTPS REST y WebSockets con Supabase Cloud.

### 4.3 Creación de `docs/INDEX.md`
Construir el índice maestro de navegación del proyecto clasificado en 5 categorías:
1. **Estrategia & Roadmaps:** `AEON_ROADMAP_V2.md`, `CURRENT_STATE_VS_TARGET.md`.
2. **Especificaciones de Arquitectura Cuántica:** `ANALISIS_PURGA_SENALES.md`, `DOSSIER_TRADER_JOURNAL_HARNESS.md`, `GUIA_HARNESS_ENGINEERING.md`.
3. **Estándares de Ingeniería:** `ENGINEERING_STANDARDS.md`, `CONVENTIONS.md`.
4. **Bitácora Viva de Cambios:** `AEON_CHANGELOG_BITACORA.md`.
5. **Archivo Histórico:** Enlace a los 9 documentos históricos preservados bajo `docs/archive/`.

---

# PARTE 5: Protocolo de Verificación y Criterios de Aceptación

1. **Pruebas de Regresión Python:**
   ```bash
   python -m unittest discover -s tests -p "test_*.py"
   ```
   *Criterio:* 28/28 pruebas pasando (100% OK), confirmando que el archivado de MT5 no altera el Centinela ni el Journal.
2. **Compilación de Producción:**
   ```bash
   npm run build
   ```
   *Criterio:* 0 errores, bundle limpio sin referencias residuales.
3. **Auditoría de Integridad Git:**
   *Criterio:* `scripts/archive/` contiene los archivos preservados, `docker-compose.yml` limpio y bitácora unificada.

---

### Solicitud de Veredicto

Presentamos este informe completo al Arquitecto y a la Dirección del proyecto para solicitar la **Aprobación Formal de Inicio para la Ejecución de las Fases 2 y 3**. No se modificará ningún archivo de base de datos ni backend hasta contar con el visto bueno explícito.
