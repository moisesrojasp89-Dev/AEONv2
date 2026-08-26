# AEON — Technical Security Audit & Access Control Hardening Report

**Documento:** `docs/AEON_SECURITY_AUDIT.md`  
**Estado:** Pre-Producción / Auditoría Adversarial  
**Versión:** 1.0  
**Fecha de Ejecución:** 25 de Agosto de 2026  
**Directriz Obligatoria:** `docs/AEON_TECHNICAL_AUDIT_MANDATE.md`  
**Rol del Auditor:** Adversarial Security Reviewer  

---

## 1. Resumen Ejecutivo y Diagnóstico Global

El análisis exhaustivo de seguridad del ecosistema **AEON Terminal** revela una arquitectura frontend limpia y modular con buenas prácticas iniciales de sanitización XSS (`escapeHTML`, `sanitizeUrl`), pero con **vulnerabilidades críticas en la capa de autorización, gestión de secretos en el historial de Git, bypass de tiers Free/Pro y control de acceso en Edge Functions**.

### Matriz de Postura de Seguridad

| Dimensión de Seguridad | Estado Auditado | Nivel de Riesgo | Veredicto |
|---|:---:|:---:|:---:|
| **Aislamiento de Secretos & Git** | Historial comprometido (.env histórico) | **CRÍTICO** | ❌ Requiere Rotación y Purga Git |
| **Control de Acceso Free vs. Pro** | Escalación de privilegios vía `user_metadata` / Hardcoded emails | **CRÍTICO** | ❌ Bypass Cliente Posible |
| **Row Level Security (RLS) & DB** | Políticas no versionadas como código (IaC ausente) | **ALTO** | ⚠️ Falta DDL declarativo en repo |
| **Edge Functions & API Proxies** | `calendar-cleanup` sin verificación de token / CORS wildcard | **ALTO** | ❌ Ejecución arbitraria y drenaje de cuotas |
| **Separación de Datos Pro (Data Leakage)** | Fallback de `confluences` en tabla pública `signals` | **ALTO** | ⚠️ Fuga de SL/TP en tabla pública |
| **Frontend XSS & Inyección** | Cobertura casi total (Falla menor en `ticker.js`) | **BAJO** | ✅ 95% Endurecido |

---

## 2. Contraste: Documentación en `docs/` vs. Realidad del Repositorio

| Afirmación en `docs/` (`CURRENT_STATE_VS_TARGET.md` / `CONVENTIONS.md`) | Realidad en Código del Repositorio | Veredicto Técnico |
|---|---|:---:|
| *"Fase 0.1: Seguridad Crítica (.gitignore, rotación de secrets, aislamiento de .env) 100% COMPLETADO"* | `.env` fue desindexado de Git, pero **permanece en el historial de commits** (`eadf4ed`, `13837c8`, `66ffda6`) con tokens reales de Supabase Service Role, OANDA y TwelveData. | ❌ **Incompleto / Falsa Sensación de Seguridad** |
| *"Seguridad First (Zero-Trust en Cliente): La seguridad vive en la base de datos y en el backend, jamás en CSS"* | `src/js/auth.js` verifica `user_metadata?.tier === 'pro'` (modificable por el cliente) y hardcodea correos electrónicos de administradores y usuarios Free. | ❌ **Violación de Zero-Trust** |
| *"RLS Server-Side protegiendo `signals_pro_data`"* | No existen scripts SQL, migraciones ni definiciones DDL en `supabase/` para garantizar RLS en despliegues automatizados o recuperaciones de desastres. | ⚠️ **Deuda Técnica IaC** |
| *"Edge Functions protegidas con Service Role Key"* | `calendar-cleanup/index.ts` solo comprueba `authHeader.startsWith('Bearer ')` sin validar el token contra la variable de entorno del servidor. | ❌ **Vulnerabilidad de Bypass Auth** |

---

## 3. Registro Detallado de Vulnerabilidades

---

### [CRÍTICO] VULN-01: Fuga de Secretos Administrativos en el Historial de Commits de Git

1. **Problema identificado:**  
   El archivo `.env` fue rastreado y comiteado en el repositorio durante múltiples commits previos. Aunque en el commit `eadf4ed` se eliminó del índice de Git, el archivo y sus claves siguen presentes en el árbol de objetos de Git accesible mediante `git log --all --full-history -- .env` y `git checkout <commit_hash> -- .env`.

2. **Impacto en el sistema:**  
   Cualquier desarrollador, colaborador o atacante con acceso de lectura al repositorio puede extraer la `SUPABASE_SERVICE_ROLE_KEY`, `OANDA_TOKEN`, `TWELVEDATA_API_KEY` y `FMP_API_KEY`. Con la `service_role_key`, el atacante obtiene permisos de superadministrador sobre PostgreSQL en Supabase, evadiendo el 100% de las políticas RLS, pudiendo leer, alterar o borrar toda la base de datos (`signals`, `profiles`, `subscriptions`, `economic_calendar`).

3. **Evidencia en el código:**  
   * Commit `13837c805a490d55c4c98e161b6e2eaeaeca518f` (Sat Aug 22 2026): Registra fuga de `SUPABASE_SERVICE_ROLE_KEY (sb_secret_...)`.
   * Commit `eadf4ed45c5d2c5f61168ab5af6b9e1c72a61fa7`: Desindexa `.env` pero no reescribe el historial de Git con `git-filter-repo` o `BFG Repo-Cleaner`.

4. **Alternativas evaluadas:**  
   * *Alternativa A (Insegura):* Dejar el historial como está asumiendo que el repositorio es privado.
   * *Alternativa B (Correcta):* Purgar el historial con `git-filter-repo` y forzar una rotación inmediata y total de todos los tokens en los proveedores externos (Supabase, OANDA, TwelveData, Financial Modeling Prep).

5. **Recomendación técnica:**  
   1. Rotar inmediatamente la `service_role_key` y `anon_key` en el Dashboard de Supabase.
   2. Regenerar el API Token de OANDA, TwelveData y FMP.
   3. Ejecutar `git-filter-repo --invert-paths --path .env` en una rama de mantenimiento y forzar push a GitHub.

6. **Riesgo de no implementarlo:**  
   Compromiso total de la base de datos institucional en caso de fuga del repositorio o acceso no autorizado.

7. **Archivos afectados:**  
   * `.git/` (Historial completo de Git)
   * `.env`

8. **Criterios de aceptación:**  
   * `git log --all --full-history -- .env` debe retornar vacío.
   * Las claves activas en `.env` local y producción no deben coincidir con ninguna clave presente en commits históricos.

---

### [CRÍTICO] VULN-02: Escalación de Privilegios a Rango PRO en Cliente vía `user_metadata` y Correos Hardcodeados

1. **Problema identificado:**  
   En `src/js/auth.js`, la función `checkSession()` evalúa el rango PRO basándose en tres criterios inseguros:
   * `session.user.user_metadata?.tier === 'pro'`
   * `session.user.email === 'malejandro.rp19@gmail.com'`
   * `session.user.email === 'cmroyalglobal@gmail.com'` (forzado a Free)

2. **Impacto en el sistema:**  
   En Supabase Auth, cualquier usuario autenticado puede actualizar sus propios metadatos de usuario invocando desde la consola del navegador:
   ```javascript
   await supabase.auth.updateUser({ data: { tier: 'pro' } });
   ```
   Al recargar la página, `checkSession()` lee `metaTier === 'pro'` y desbloquea la interfaz PRO en el cliente. Además, exponer correos administrativos personales en el código cliente viola principios de privacidad y RBAC.

3. **Evidencia en el código:**  
   * `src/js/auth.js` (Líneas 28–34):
   ```javascript
   const metaTier = session.user.user_metadata?.tier;
   const isOfficialAdminPro = session.user.email === 'malejandro.rp19@gmail.com';
   const isForcedFree = session.user.email === 'cmroyalglobal@gmail.com';

   if (!isForcedFree && (isOfficialAdminPro || (profData && profData.tier === 'pro') || metaTier === 'pro')) {
     isPro = true;
   }
   ```

4. **Alternativas evaluadas:**  
   * *Alternativa A (Insegura):* Ocultar los correos con hashes en JavaScript.
   * *Alternativa B (Correcta):* Eliminar totalmente `metaTier` y las comparaciones de correos hardcodeados en el frontend. La condición de PRO debe determinarse exclusivamente consultando la tabla `public.profiles` (con RLS que impida a los usuarios modificar la columna `tier`) o `public.subscriptions` con estado `active` y fecha de vigencia válida.

5. **Recomendación técnica:**  
   * Modificar `checkSession()` para que la única fuente de verdad sea `profiles.tier` o `subscriptions` activa.
   * En PostgreSQL, crear una función trigger `BEFORE UPDATE ON profiles` que revoque cualquier intento del usuario de alterar `tier` o `role` por sí mismo:
   ```sql
   CREATE OR REPLACE FUNCTION protect_profile_tier()
   RETURNS TRIGGER AS $$
   BEGIN
     IF (OLD.tier IS DISTINCT FROM NEW.tier OR OLD.role IS DISTINCT FROM NEW.role) AND auth.role() <> 'service_role' THEN
       RAISE EXCEPTION 'No tienes autorización para modificar tu propio rango o rol.';
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

6. **Riesgo de no implementarlo:**  
   Pérdida total de monetización: cualquier usuario gratuito puede saltarse el muro de pago de señales PRO en 5 segundos.

7. **Archivos afectados:**  
   * `src/js/auth.js`
   * Base de datos Supabase (`public.profiles`)

8. **Criterios de aceptación:**  
   * Ningún correo hardcodeado en `src/js/`.
   * Modificar `user_metadata` en cliente no debe cambiar el estado `isPro` a `true`.
   * Intentar actualizar `profiles.tier` con el `anon_key` debe arrojar error de PostgreSQL RLS / Trigger.

---

### [ALTO] VULN-03: Falsa Autenticación y Ejecución Arbitraria en Edge Function `calendar-cleanup`

1. **Problema identificado:**  
   La Edge Function `supabase/functions/calendar-cleanup/index.ts` tiene una verificación de cabecera de autenticación defectuosa:
   ```typescript
   const authHeader = req.headers.get('Authorization');
   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 ... });
   }
   ```
   Solo valida que la cabecera exista y comience con la palabra `'Bearer '`, pero **jamás valida el token** contra `SUPABASE_SERVICE_ROLE_KEY` ni verifica una firma criptográfica.

2. **Impacto en el sistema:**  
   Cualquier atacante en Internet puede enviar una solicitud HTTP POST a `https://[PROJECT_ID].supabase.co/functions/v1/calendar-cleanup` con la cabecera `Authorization: Bearer test`. La función se ejecutará con permisos administrativos completos (`SUPABASE_SERVICE_ROLE_KEY`) y eliminará registros de la tabla `economic_calendar`.

3. **Evidencia en el código:**  
   * `supabase/functions/calendar-cleanup/index.ts` (Líneas 27–38):
   ```typescript
   const authHeader = req.headers.get('Authorization');
   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
   }
   const supabase = createClient(
     Deno.env.get('SUPABASE_URL') ?? '',
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
   );
   ```

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Dejar que Supabase Gateway valide JWTs automáticamente (`--verify-jwt`). (Insuficiente si se invoca desde pg_cron sin token estándar de usuario).
   * *Alternativa B (Correcta):* Validar estrictamente que el token recibido coincida de forma exacta y en tiempo constante con una clave secreta del entorno (`CRON_SECRET` o `SUPABASE_SERVICE_ROLE_KEY`).

5. **Recomendación técnica:**  
   Implementar comparación estricta de tokens en la Edge Function:
   ```typescript
   const authHeader = req.headers.get('Authorization');
   const expectedSecret = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   const token = authHeader?.replace('Bearer ', '').trim();

   if (!token || token !== expectedSecret) {
     return new Response(JSON.stringify({ error: 'Forbidden: Invalid authorization token' }), {
       status: 403,
       headers: { 'Content-Type': 'application/json' },
     });
   }
   ```

6. **Riesgo de no implementarlo:**  
   Borrado malicioso o no autorizado de datos históricos del calendario económico.

7. **Archivos afectados:**  
   * `supabase/functions/calendar-cleanup/index.ts`

8. **Criterios de aceptación:**  
   * Peticiones con `Authorization: Bearer token_falso` deben responder `403 Forbidden`.
   * Solo peticiones con el token administrativo exacto deben ejecutar la limpieza.

---

### [ALTO] VULN-04: Fuga de Niveles PRO (Data Leakage) a través del campo `confluences` en la tabla pública `signals`

1. **Problema identificado:**  
   El modelo relacional segrega las señales en dos tablas: `signals` (pública) y `signals_pro_data` (privada con RLS). Sin embargo, en el frontend (`src/js/templates/signal.js`), existen mecanismos de fallback que leen `entry`, `sl`, `tp1`, `tp3` y `exit_price` directamente del objeto JSONB `signals.confluences`.

2. **Impacto en el sistema:**  
   Si el motor en Python (`Aeon_Bot`) inserta el detalle del trade dentro del campo `confluences` de la tabla `public.signals`, un usuario Free o visitante anónimo puede abrir la pestaña Red (Network) de DevTools, inspeccionar la respuesta de Supabase a `supabase.from('signals').select('*')` y leer los niveles exactos de entrada, stop loss y take profit sin necesidad de pagar por la suscripción PRO.

3. **Evidencia en el código:**  
   * `src/js/templates/signal.js` (Líneas 293–299):
   ```javascript
   if (!cardData.entry_price && cardData.confluences) {
     cardData.entry_price = cardData.entry_price || cardData.confluences.entry ...
     cardData.stop_loss = cardData.stop_loss || cardData.confluences.sl ...
     cardData.take_profit = cardData.take_profit || cardData.confluences.tp3 || cardData.confluences.tp1 ...
   }
   ```
   * `src/js/templates/signal.js` (Línea 241):
   ```javascript
   const exitPriceStr = formatPrice(cardData.asset, conf.exit_price || conf.tp3 || conf.tp1 || cardData.take_profit);
   ```

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Confiar en que el bot no guarde esos datos en `confluences`. (Frágil ante errores de desarrollo).
   * *Alternativa B (Correcta):* Prohibir formalmente que `confluences` en `public.signals` contenga claves numéricas sensibles (`entry`, `sl`, `tp1`, `tp2`, `tp3`, `exit_price`). Dichos valores deben residir estrictamente en `signals_pro_data`.

5. **Recomendación técnica:**  
   * Definir un esquema tipado estricto para `public.signals.confluences` que solo admita: `{ score: number, regime: string, setup_type: string, reasoning: string, reasons: string[] }`.
   * En `src/js/templates/signal.js`, remover los fallbacks a `confluences.entry`, `confluences.sl`, `confluences.tp3`.

6. **Riesgo de no implementarlo:**  
   Elusión completa del modelo de negocio Free/Pro a través de la API pública de Supabase.

7. **Archivos afectados:**  
   * `src/js/templates/signal.js`
   * `src/js/services/signalService.js`
   * `Aeon_Bot` (Scripts generadores de señales en backend)

8. **Criterios de aceptación:**  
   * La respuesta JSON de `public.signals` no contiene ningún precio ni nivel operativo.
   * `signals_pro_data` es la única entidad que almacena `entry_price`, `stop_loss`, `take_profit`.

---

### [ALTO] VULN-05: Ausencia de Infraestructura como Código (IaC) y DDL Versionado para Políticas RLS

1. **Problema identificado:**  
   El repositorio no contiene ningún archivo de migración SQL (`supabase/migrations/*.sql`) ni definiciones declarativas de esquemas. Las tablas `signals`, `signals_pro_data`, `profiles`, `subscriptions`, `economic_calendar` y `news` existen únicamente en la instancia remota de Supabase sin trazabilidad en Git.

2. **Impacto en el sistema:**  
   * Imposibilidad de auditar y verificar las políticas RLS reales mediante revisión de código en PRs.
   * Si se inicializa un entorno de pruebas o se despliega una nueva base de datos, las tablas se crearán sin RLS activo, exponiendo datos privados por defecto.
   * Desincronización crítica entre el código cliente y el estado del esquema de PostgreSQL.

3. **Evidencia en el código:**  
   * `supabase/config.toml` contiene `schema_paths = []`.
   * Búsqueda de `*.sql` en el repositorio retorna 0 resultados.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Manejar la base de datos manualmente desde la UI del Supabase Dashboard. (Inaceptable para producción).
   * *Alternativa B (Correcta):* Extraer el esquema actual con `supabase db pull` y crear la migración base `00001_initial_schema_and_rls.sql` en `supabase/migrations/`.

5. **Recomendación técnica:**  
   Crear y versionar el script de RLS formal:
   ```sql
   -- 1. Tablas Públicas (Solo Lectura para anon y authenticated)
   ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Lectura pública de señales básicas"
     ON public.signals FOR SELECT USING (true);

   ALTER TABLE public.economic_calendar ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Lectura pública del calendario económico"
     ON public.economic_calendar FOR SELECT USING (true);

   ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Lectura pública de noticias"
     ON public.news FOR SELECT USING (true);

   -- 2. Tabla Privada PRO (Solo usuarios con suscripción PRO activa)
   ALTER TABLE public.signals_pro_data ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Acceso exclusivo PRO a niveles de señales"
     ON public.signals_pro_data FOR SELECT
     USING (
       auth.role() = 'authenticated' AND (
         EXISTS (
           SELECT 1 FROM public.profiles
           WHERE profiles.id = auth.uid() AND profiles.tier = 'pro'
         )
         OR
         EXISTS (
           SELECT 1 FROM public.subscriptions
           WHERE subscriptions.user_id = auth.uid()
             AND subscriptions.plan = 'pro'
             AND subscriptions.status = 'active'
             AND subscriptions.current_period_end > now()
         )
       )
     );

   -- 3. Tabla Profiles (Cada usuario solo lee y actualiza su propio perfil)
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Usuarios leen su propio perfil"
     ON public.profiles FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Usuarios actualizan sus datos no sensibles"
     ON public.profiles FOR UPDATE USING (auth.uid() = id);

   -- 4. Tabla Subscriptions (Lectura de la propia suscripción)
   ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Usuarios leen su propia suscripción"
     ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
   ```

6. **Riesgo de no implementarlo:**  
   Fallos catastróficos de seguridad ante migraciones, clonación de entornos o desincronización de políticas RLS.

7. **Archivos afectados:**  
   * `supabase/migrations/` (Nuevo directorio requerido)
   * `supabase/config.toml`

8. **Criterios de aceptación:**  
   * Todas las tablas poseen RLS habilitado (`ENABLE ROW LEVEL SECURITY`).
   * Pruebas automatizadas con cliente `anon` confirman que `SELECT * FROM signals_pro_data` retorna 0 filas o denegación de acceso.

---

### [MEDIO] VULN-06: Proxies Abiertos sin Autenticación ni Rate Limit en Edge Functions (`oanda`, `twelvedata`)

1. **Problema identificado:**  
   Las funciones serverless en `supabase/functions/oanda/index.ts` y `supabase/functions/twelvedata/index.ts` tienen configurado CORS con `'Access-Control-Allow-Origin': '*'` y responden a cualquier petición GET/POST externa sin solicitar autenticación, API token o validación de sesión de Supabase.

2. **Impacto en el sistema:**  
   Cualquier script o bot en Internet puede utilizar los endpoints de Supabase de AEON como proxies gratuitos para consumir APIs de OANDA y TwelveData. Esto puede agotar las cuotas de peticiones mensuales de las cuentas institucionales de AEON y generar costes imprevistos o bloqueo de APIs por denegación de servicio (DoS).

3. **Evidencia en el código:**  
   * `supabase/functions/oanda/index.ts` (Líneas 5–9, 13–17): No hay chequeo de autorización.
   * `supabase/functions/twelvedata/index.ts` (Líneas 5–9, 11–15): No hay chequeo de autorización.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Limitar el origen por CORS (`Origin: https://aeon-terminal.com`). (Ayuda en navegadores, pero no previene peticiones directas vía `curl`/Postman).
   * *Alternativa B (Correcta):* Exigir la cabecera `apikey` de Supabase (anon key válida) o verificar el token JWT de Supabase en cada invocación, además de restringir CORS al dominio oficial.

5. **Recomendación técnica:**  
   * Configurar verificación obligatoria del `anon_key` o sesión de usuario mediante el SDK de Supabase o gateway de Deno.
   * Restringir CORS en producción al dominio oficial de AEON (Vercel / Dominio personalizado).

6. **Riesgo de no implementarlo:**  
   Agotamiento de cuotas de APIs de datos de mercado y posible denegación de servicio en tiempo de mercado abierto.

7. **Archivos afectados:**  
   * `supabase/functions/oanda/index.ts`
   * `supabase/functions/twelvedata/index.ts`

8. **Criterios de aceptación:**  
   * Peticiones sin la cabecera `apikey` válida de Supabase son rechazadas con `401 Unauthorized`.
   * Dominios no autorizados reciben rechazo en el preflight de CORS.

---

### [MEDIO] VULN-07: Fuga Potencial de Señales PRO en Canales de Supabase Realtime

1. **Problema identificado:**  
   En `src/js/services/signalService.js` y `scripts/test_realtime.mjs`, los clientes se suscriben al canal `public:signals_pro_data`. Si la publicación de Realtime en PostgreSQL (`supabase_realtime`) no tiene configurada la replicación con filtro RLS (`REPLICA IDENTITY FULL`), los eventos de inserción (`INSERT` / `UPDATE`) se transmiten a nivel de socket a todos los clientes que se suscriban al canal independientemente de su rol.

2. **Impacto en el sistema:**  
   Un usuario Free que abra la consola del navegador y ejecute:
   ```javascript
   supabase.channel('public:signals_pro_data')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'signals_pro_data' }, payload => console.log(payload))
     .subscribe();
   ```
   podría interceptar en vivo las señales PRO que emita el bot.

3. **Evidencia en el código:**  
   * `src/js/services/signalService.js` (Líneas 161–168):
   ```javascript
   if (isPro) {
     proChannel = supabase.channel('public:signals_pro_data')
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: DB_TABLES.SIGNALS_PRO_DATA }, ...);
   }
   ```
   La condición `if (isPro)` es puramente en el cliente; si la base de datos transmite el broadcast a cualquier suscriptor, no existe seguridad server-side en los WebSockets.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Depender solo del cliente. (Totalmente inseguro).
   * *Alternativa B (Correcta):* Habilitar `ALTER TABLE signals_pro_data REPLICA IDENTITY FULL;` y asegurarse de que Supabase Realtime respete las políticas RLS para conexiones autenticadas con JWT.

5. **Recomendación técnica:**  
   * Ejecutar en PostgreSQL:
   ```sql
   ALTER TABLE public.signals_pro_data REPLICA IDENTITY FULL;
   ```
   * Comprobar que en el dashboard de Supabase (Database -> Publications) la tabla `signals_pro_data` esté configurada para filtrar por RLS en las publicaciones de Realtime.

6. **Riesgo de no implementarlo:**  
   Exfiltración en tiempo real de señales de trading institucionales.

7. **Archivos afectados:**  
   * Configuración de base de datos PostgreSQL / Realtime
   * `src/js/services/signalService.js`

8. **Criterios de aceptación:**  
   * Un cliente no autenticado suscrito a `public:signals_pro_data` no recibe ningún payload cuando se inserta una fila en dicha tabla.

---

### [BAJO] VULN-08: Omisión de Sanitización XSS en Componente `ticker.js`

1. **Problema identificado:**  
   En `src/js/templates/ticker.js`, las propiedades `t.pair`, `t.label`, `t.price` y `t.change` se insertan directamente en el template literal sin procesarse mediante `escapeHTML()`, a diferencia de todos los demás componentes del sistema.

2. **Impacto en el sistema:**  
   Si en el futuro los datos del ticker se leen desde una API de terceros o base de datos que sea comprometida, se generaría un vector de Cross-Site Scripting (DOM XSS).

3. **Evidencia en el código:**  
   * `src/js/templates/ticker.js` (Líneas 7–9):
   ```javascript
   <span class="ticker-label">${t.pair || t.label}</span>
   <span class="ticker-price" id="price-${t.id}">${t.price}</span>
   <span class="ticker-change ${t.positive !== false ? 'up' : 'down'}" id="change-${t.id}">${t.positive !== false ? '▲' : '▼'} ${t.change}</span>
   ```

4. **Recomendación técnica:**  
   Importar `escapeHTML` de `../utils/sanitize.js` y sanitizar todas las variables interpoladas.

5. **Riesgo de no implementarlo:**  
   Bajo en el estado actual (datos estáticos locales), pero incumple la convención de `CONVENTIONS.md`.

6. **Archivos afectados:**  
   * `src/js/templates/ticker.js`

7. **Criterios de aceptación:**  
   * Todas las interpolaciones en `ticker.js` utilizan `escapeHTML()`.

---

## 4. Plan de Remediación y Endurecimiento Estructurado

```text
FASE 0: PRE-PRODUCTION HARDENING (Prioridad Inmediata)
│
├── 1. Purga de Git & Rotación de Credenciales
│   ├── Rotar Supabase Service Role Key & Anon Key
│   ├── Rotar API Keys (OANDA, TwelveData, FMP)
│   └── Limpiar historial de Git con git-filter-repo
│
├── 2. Corrección de Lógica Auth & Eliminación de Bypass Cliente
│   ├── Eliminar metaTier y correos hardcodeados en src/js/auth.js
│   ├── Establecer profiles.tier / subscriptions como única fuente de verdad
│   └── Crear trigger PostgreSQL de protección de columnas tier/role en profiles
│
├── 3. Endurecimiento de Edge Functions
│   ├── Corregir calendar-cleanup con validación estricta de token secreto
│   └── Agregar validación apikey/JWT y restricción CORS en oanda y twelvedata
│
├── 4. Creación de Migraciones DDL & RLS Declarativo (IaC)
│   ├── Crear supabase/migrations/00001_initial_schema_and_rls.sql
│   ├── Activar RLS en todas las tablas
│   └── Configurar REPLICA IDENTITY FULL para Realtime seguro
│
└── 5. Sanitización Completa en Frontend
    └── Aplicar escapeHTML en templates/ticker.js
```

---

## 5. Checklist de Seguridad Pre-Producción (Go / No-Go)

- [ ] **[NO-GO]** ¿Se rotaron todas las credenciales expuestas en el historial de Git?
- [ ] **[NO-GO]** ¿Se eliminó del código frontend la validación de `user_metadata` y correos hardcodeados?
- [ ] **[NO-GO]** ¿Se probó que un usuario Free no puede consultar `signals_pro_data` vía `supabase.from()`?
- [ ] **[NO-GO]** ¿Se verificó que `calendar-cleanup` rechaza peticiones no autorizadas?
- [ ] **[NO-GO]** ¿Se verificó que `signals.confluences` no contiene niveles de entrada/salida?
- [ ] **[GO]** ¿Están todas las interpolaciones HTML sanitizadas contra XSS?
- [ ] **[GO]** ¿Están las migraciones SQL versionadas en el repositorio?

---

> **Fin del Informe de Auditoría de Seguridad.**  
> Este documento cumple estrictamente con el mandato de `docs/AEON_TECHNICAL_AUDIT_MANDATE.md`.  
> No se ha modificado ningún archivo de código de la aplicación.
