# AEON — Technical Audit, Documentation Rebalance & Roadmap Recalibration

**Estado:** Auditoría pre-producción & Gobernanza Técnica  
**Rol del Agente:** Auditor Técnico / Adversarial Reviewer (No modificar código de producto durante esta fase)  
**Objetivo:** Romper, cuestionar, validar y endurecer AEON antes de incorporar clientes reales.

---

## 1. Contexto y Arquitectura del Sistema

AEON está evolucionando desde una web económica hacia una plataforma de inteligencia macroeconómica, análisis de mercados y señales cuantitativas.

### Stack y Componentes Actuales
* **Frontend:** Vanilla HTML5 / CSS3 / JavaScript (ES Modules) + Vite.
* **Backend Database & Auth:** Supabase / PostgreSQL / RLS / Realtime.
* **Motor Cuantitativo:** `Aeon_Bot` en Python.
* **Proveedor de Datos (Desarrollo):** OANDA API.
* **Orquestación (Desarrollo):** GitHub Actions cron workflows (ejecución programada para optimizar costes de infraestructura en fase dev).
* **Módulos Activos:** Señales cuantitativas, detector de régimen, scoring, herramientas de market structure / Volume Profile / VWAP, Trade Watcher, Calendario económico y Briefing diario.
* **Monetización / Tiers:** Sistema Free / Pro con segregación de datos.
* **Alertas:** Bot / canal de Telegram integrado.
* **Backtesting:** Dataset histórico extraído de Exness (~90.000 velas) ya procesado y testeado.

### Transición Arquitectónica (Desarrollo vs. Producción)

```text
ARQUITECTURA ACTUAL (Desarrollo):
OANDA API ───► Aeon_Bot (Python) ───► GitHub Actions ───► Supabase (DB/RLS) ───► AEON Web (Vite)

ARQUITECTURA TARGET (Producción):
Exness + MT5 ───► VPS Host ───► Aeon_Bot / Quant Engine ───► Supabase ───► AEON Terminal ───► Usuarios Finales
```

> **Mandato:** El agente debe verificar que el código permita esta transición limpia sin acoplar las estrategias ni la lógica de cálculo a OANDA o a GitHub Actions.

---

## 2. Jerarquía Documental y Reconciliación de `docs/`

Para evitar duplicaciones, archivos obsoletos y deuda documental, se establece una gobernanza estricta sobre la carpeta `docs/`.

### Estructura de Roles de Documentación

```text
docs/
├── AEON_MASTER_PLAN.md        ───► Documento histórico / Plan original
├── AEON_Master_Plan_v2.md     ───► Dirección estratégica de producto
├── CURRENT_STATE_VS_TARGET.md ───► Fotografía técnica real (Dónde estamos vs Dónde queremos llegar)
├── CONVENTIONS.md             ───► Constitución técnica y reglas de desarrollo
│
├── [Entregables Auditoría]:
├── AEON_TECHNICAL_AUDIT.md    ───► Auditoría técnica de arquitectura y código
├── AEON_SECURITY_AUDIT.md     ───► Auditoría de seguridad, RLS, secretos y vectores
├── AEON_QUANT_AUDIT.md        ───► Auditoría científica, cuantitativa y backtesting
└── AEON_ROADMAP_V2.md         ───► Roadmap ejecutable priorizado y recalibrado
```

### Reglas para el Manejo Documental
1. **El código real es la única fuente de verdad:** Ningún documento existente debe tomarse como verdad absoluta sin verificar el repositorio.
2. **No sobrescribir `CURRENT_STATE_VS_TARGET.md` de entrada:** Se debe leer, contrastar contra el código y, tras completar las auditorías, actualizarlo directamente para reflejar la realidad del sistema eliminando contradicciones y versiones paralelas.
3. **`CONVENTIONS.md` como Constitución Técnica:** Debe consolidar las reglas no negociables del proyecto (seguridad, servicios, RLS, abstracción de proveedores, etc.).

---

## 3. Objetivo y Filosofía de la Auditoría

> **Misión: Intenta romper AEON antes de que lo hagan los usuarios.**

El agente debe asumir un rol estrictamente adversarial. No se busca una auditoría complaciente ni validar ideas sin fundamento empírico. Se debe buscar activamente:

* Fallos arquitectónicos y acoplamientos rígidos.
* Fugas de secretos, variables expuestas en bundles frontend o historial Git.
* Bypass de autorización Free/Pro e IDORs en queries a Supabase.
* RLS mal configurado o ausente en tablas críticas (`signals_pro_data`, `profiles`, etc.).
* Problemas de concurrencia, race conditions y señales duplicadas/inconsistentes.
* Errores de timezone, lifecycle de datos y consumo de datos stale.
* Fallos y desconexiones de proveedores de datos.
* Sesgos en backtesting: **Look-ahead bias**, **Data leakage**, **Overfitting** y parámetros sobreoptimizados.
* Falta de modelado de costes reales (spread, slippage, comisión, swaps, latencia).
* Vulnerabilidades y limitaciones en GitHub Actions (timeouts, rate limits, fallos silenciosos).
* Deuda técnica, falta de idempotencia y ausencia de observabilidad/alerting.
* Claims de marketing no sustentados por rigor matemático/cuantitativo real.

---

## 4. Áreas Críticas de Auditoría

### A. Arquitectura y Desacoplamiento
* Evaluar la separación de responsabilidades: `Frontend` ──► `Supabase` ──► `Aeon_Bot`.
* Detectar si existe lógica de negocio crítica o cálculos ejecutados en el cliente.
* Evaluar una abstracción formal de datos que aísle la estrategia:

```text
Strategy Engine
       ▲
       │ (Consume modelo normalizado)
Normalized Market Data
       ▲
Data Provider Interface
 ┌─────┴───────────────┐
 │                     │
OANDA Provider     MT5 / Exness Provider
```

### B. Seguridad y Control de Acceso
* Revisar exhaustivamente el uso de `service_role` vs `anon_key` de Supabase.
* Auditar políticas RLS en todas las tablas (`signals`, `signals_pro_data`, `profiles`).
* Comprobar que un usuario Free no pueda obtener datos Pro manipulando consultas desde DevTools/Network.
* **Regla estricta:** La seguridad vive en la base de datos y en el backend, jamás en CSS (`display: none`, `blur`, `disabled`).

### C. Auditoría Cuantitativa y Backtesting Científico
* Auditar el backtest histórico (~90.000 velas de Exness).
* Verificar división de datos: `TRAIN` / `VALIDATION` / `TEST` (In-Sample vs Out-of-Sample) y Walk-Forward analysis.
* Revisar indicadores y parámetros sospechosos (ej. ADX $N=3$, SMA 20, VWAP de sesión, Volume Profile POC, pesos de scoring) para descartar sobreajuste.
* Exigir modelado de fricción de mercado: spreads dinámicos, comisiones, slippage y latencia de ejecución.
* **Diferenciación conceptual rigurosa:** Distinguir claramente entre métricas derivadas de FX Spot / CFDs vs. Order Flow institucional real de Futuros (Volume Profile/VWAP no son equivalentes a Footprint, Depth of Market / DOM o Delta de futuros centralizados).

### D. Trade Watcher y Máquina de Estados
* Auditar el ciclo de vida de señales: `CREATED` ──► `ACTIVE` ──► `BE` (Break-Even) ──► `CLOSED`.
* Garantizar idempotencia ante reinicios del bot, desconexiones o fallos en GitHub Actions/VPS.
* Registrar métricas de ejecución: `signal_id`, `status`, `opened_at`, `be_at`, `closed_at`, `entry_price`, `exit_price`, `exit_reason`.

### E. Integración de IA (Capa Contextual, no Determinista)
* La IA no debe generar señales ciegas ni sustituir al motor cuantitativo determinista.

```text
MARKET DATA ──► QUANT ENGINE ──► METRICS & SIGNALS ──► CONTEXT & MACRO ──► AI INTERPRETATION
```

---

## 5. Fases Propuestas del Roadmap (A recalibrar tras la auditoría)

* **PHASE 0:** Security & Pre-Production Hardening (Secretos, RLS, Sanitización, Free/Pro).
* **PHASE 1:** Architecture & Data Layer (Abstracción de Data Providers, modelos internos).
* **PHASE 2:** Quant Validation Lab (Backtest Out-of-Sample, costes, stress tests).
* **PHASE 3:** Production Quant Engine (Migración a VPS, MT5/Exness, lifecycle, recovery).
* **PHASE 4:** AEON Market Intelligence (Régimen de mercado, scoring explicable, macro).
* **PHASE 5:** AI Intelligence Layer (Briefing, agentes analíticos contextuales).
* **PHASE 6:** AEON Pro / Terminal (Monetización, UI avanzada, límites de uso).
* **PHASE 7 & 8:** Futures Intelligence & Advanced Order Flow (Futuros centralizados, Footprint, Delta).
* **PHASE 9:** Scale & High Reliability (Workers, failover, alertas críticas).

---

## 6. Flujo de Ejecución y Entregables

### Flujo Obligatorio de Trabajo

```text
1. Auditar Código y Repositorio Real
       ↓
2. Contrastar Documentación Existente (MASTER_PLAN, V2, CONVENTIONS, CURRENT_STATE)
       ↓
3. Generar Informes de Auditoría (Technical, Security, Quant)
       ↓
4. Generar AEON_ROADMAP_V2.md
       ↓
5. Actualizar CURRENT_STATE_VS_TARGET.md con la verdad técnica
       ↓
6. Revisión Humana y Aprobación
       ↓
7. Inicio de Modificación de Código
```

### Entregables Requeridos

1. `docs/AEON_TECHNICAL_AUDIT.md`: Arquitectura, deuda técnica, acoplamientos, riesgos y refactorizaciones recomendadas.
2. `docs/AEON_SECURITY_AUDIT.md`: Vulnerabilidades, RLS, secretos, gestión de tokens, Auth y vectores de ataque Free/Pro.
3. `docs/AEON_QUANT_AUDIT.md`: Metodología cuantitativa, integridad de datos, backtesting, overfitting, look-ahead bias y plan de validación.
4. `docs/AEON_ROADMAP_V2.md`: Priorización definitiva, dependencias, estados (Terminado / Parcial / Congelar / Construir) y criterios de aceptación.
5. `docs/CURRENT_STATE_VS_TARGET.md`: Reconciliado y actualizado con el estado real del repositorio.

---

## 7. Instrucción Final para el Agente

Antes de proponer o implementar cualquier solución estructural, el agente debe justificar:
1. **Problema identificado**
2. **Impacto en el sistema**
3. **Evidencia en el código**
4. **Alternativas evaluadas**
5. **Recomendación técnica**
6. **Riesgo de no implementarlo**
7. **Archivos afectados**
8. **Criterios de aceptación**

> **Primero auditar, después validar, finalmente construir.**
