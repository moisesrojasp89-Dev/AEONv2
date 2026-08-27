# AEON — Estándares de Ingeniería de Software Profesional & Infraestructura

**Documento:** `docs/ENGINEERING_STANDARDS.md`  
**Estado:** Directriz Oficial de Arquitectura y Buenas Prácticas  
**Versión:** 1.0  
**Fecha de Aprobación:** 27 de Agosto de 2026  
**Documentos Relacionados:**  
- 🗺️ [`docs/AEON_ROADMAP_V2.md`](file:///c:/Users/indatech\Desktop\Proyectos\Fintech\AEON\docs\AEON_ROADMAP_V2.md)  
- 📐 [`docs/CONVENTIONS.md`](file:///c:/Users/indatech\Desktop\Proyectos\Fintech\AEON\docs\CONVENTIONS.md)  
- 📋 [`docs/CURRENT_STATE_VS_TARGET.md`](file:///c:/Users/indatech\Desktop\Proyectos\Fintech\AEON\docs\CURRENT_STATE_VS_TARGET.md)  

---

## 🏛️ 1. Filosofía: Vibe Coding con Rigor de Ingeniería Senior

El desarrollo ágil asistido por IA (*vibe coding*) permite acelerar la construcción de interfaces y flujos de usuario, pero **en fintech y trading cuantitativo los fallos de lógica o concurrencia son fatales**. 

> *"El límite del vibe coding aparece donde la deuda técnica oculta se vuelve fatal: los núcleos, compiladores, bases de datos y sistemas financieros exigen invariantes estrictos y cero parches ciegos."*

AEON opera bajo una política de **Calidad por Diseño (Quality Gates)**:
1. **Cero Deuda Técnica Oculta:** Ninguna función crítica pasa a producción sin validación de tipos, sanitización y tests de invariantes.
2. **Build Ultra-Rápido & Determinista:** Compilación Vite obligatoria en $< 400\text{ms}$.
3. **Seguridad Zero-Trust:** Todo acceso a datos sensibles se resuelve en PostgreSQL mediante Row-Level Security (RLS).

---

## 💳 2. Arquitectura de Pagos Idempotente & Transactional Outbox (Fase 6)

Para el sistema de monetización y suscripciones Pro con **Stripe**:

### A. Claves de Idempotencia (`Idempotency-Key`)
* Toda solicitud de cobro o procesamiento de webhook debe registrar un identificador único (`event.id` de Stripe).
* Si la red experimenta timeouts o reintentos, el endpoint verifica si el evento ya fue procesado antes de mutar la base de datos, **garantizando que ningún usuario sea cobrado dos veces ni sufra duplicidad de suscripciones**.

### B. Patrón Transactional Outbox
```text
[ Pago Stripe ] ──► [ DB Commit ] ──► [ Tabla Outbox ] ──► [ Worker Asíncrono ] ──► [ Notificación / Email ]
```
* **Principio:** Los servicios externos (envío de emails de bienvenida, notificaciones push) son efectos secundarios y **nunca deben bloquear la transacción de la base de datos**.
* Si el servidor de correos está caído o lento, el pago se confirma con éxito y el worker reintenta el envío en segundo plano.

---

## 🛡️ 3. Hardening y Seguridad Militar para el Servidor VPS Linux

Para la infraestructura de trading 24/7 en Linux (Ubuntu 24.04 LTS / LD4 Londres):

### A. Configuración Estricta de SSH (`/etc/ssh/sshd_config`)
```bash
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers aeon_operator
```

### B. Defensa en Profundidad & Prevención de Intrusiones
1. **Firewall UFW / Whitelist de IP:** Exponer únicamente los puertos estrictamente necesarios.
2. **`fail2ban`:** Baneo automático de direcciones IP que acumulen intentos fallidos de autenticación.
3. **Aislamiento de Procesos:** Los 3 daemons de AEON (`aeon-quant-daemon`, `aeon-macro-ai`, `aeon-calendar-watcher`) corren en contenedores Docker independientes orquestados vía `docker-compose.yml`. Si uno se reinicia, no afecta al resto.

### C. Política de Backups Cifrados Automáticos (Offsite)
* **Regla 3-2-1:** Copias de seguridad de la base de datos ejecutadas por cron nocturno (ej. 03:00 AM UTC):
  ```bash
  # Dump comprimido y cifrado con age / gpg
  pg_dump -Fc aeon_db | age -r $BACKUP_PUBLIC_KEY > /backups/aeon_db-$(date +%F).age

  # Subida segura fuera del servidor a bucket S3 / Cloudflare R2 con rclone
  rclone copy /backups r2:aeon-backups

  # Rotación automática de retención (14 días)
  find /backups -mtime +14 -delete
  ```
* **Prueba Mensual de Restore:** *"Un backup que nunca se ha restaurado no es un backup, es un acto de fe."* Se ejecuta una prueba de restauración mensual en un entorno de pruebas aislado.

---

## 🗄️ 4. Escalabilidad de Base de Datos para Carga 95% Lecturas

Dado que una terminal financiera es **95% tráfico de lecturas** y 5% escrituras:

### A. Agregaciones en Servidor vía RPC
* Cero cálculos pesados en el frontend: métricas de Track Record, Win Rate y R Neto se calculan en PostgreSQL mediante funciones RPC optimizadas (`get_track_record_summary`) con tiempo de ejecución $< 50\text{ms}$.

### B. Eliminación Perezosa (Lazy Deletion) & Limpieza por TTL
* En lugar de ejecutar `DELETE` masivos que bloqueen tablas de noticias o eventos del calendario, se utiliza filtrado por expiración:
  ```sql
  SELECT * FROM public.news WHERE created_at >= NOW() - INTERVAL '48 hours';
  ```
* La depuración física se realiza en horarios de baja volatilidad mediante tareas programadas.

### C. Optimización de Conteos
* Evitar `SELECT COUNT(*)` secuencial en tablas con millones de registros; utilizar estimaciones rápidas de metadatos (`pg_class.reltuples`) o contadores materializados.

---

## 🧠 5. Inteligencia de Mercado basada en Grafos de Contexto

El módulo **AEON Intelligence** evoluciona más allá de un generador de texto hacia un **grafo de conocimiento estructurado**:
* Cada catalizador macroeconómico (ej. *Core PCE* o *Decisión de Tipos*) se conecta mediante dependencias causales directas a los activos afectados:
  * $\text{Inflación PCE} \uparrow \implies \text{Rendimientos 10Y} \uparrow \implies \text{DXY} \uparrow \implies \text{XAU/USD} \downarrow \text{ (Pullback)}$.
* La IA opera con **Grounding Estricto** (`temperature=0.1` y validación de esquemas JSON), impidiendo la generación de precios o niveles no confirmados por los ticks de mercado.

---

## 📑 6. Resumen de Calidad para el Equipo de Desarrollo

| Área | Estándar Obligatorio | Verificación |
|---|---|:---:|
| **Frontend** | Single Source of Truth (`constants.js`), Cero Hardcode, XSS Sanitization (`escapeHTML`). | Build Vite $< 400\text{ms}$ |
| **Backend / DB** | RLS Zero-Trust, Funciones RPC indexadas, Idempotencia en Webhooks. | Migraciones SQL Versionadas |
| **VPS / Infra** | SSH endurecido, `fail2ban`, Docker Compose aislado, backups cifrados offsite. | Healthcheck cada 30s |
| **Trading Core** | Cero Look-Ahead Bias en dPOC/VWAP, deducción de comisiones y slippage real. | WFO $WFE \ge 65\%$ |
