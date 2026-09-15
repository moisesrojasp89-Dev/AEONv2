# 🗄️ AEON — Scripts y Módulos Archivados

Este directorio almacena código, daemons y herramientas de versiones anteriores que han sido **archivados formalmente** para fines de auditoría histórica, trazabilidad y gobernanza de código.

---

## ⚠️ ADVERTENCIA DE SEGURIDAD & GOBERNANZA (MAS v1.1.0)

> [!WARNING]
> **ESTOS ARCHIVOS NO DEBEN EJECUTARSE EN PRODUCCIÓN NI MONTARSE EN CONTENEDORES.**
> Han sido retirados del flujo activo del sistema tras la transición de AEON hacia una **Terminal de Inteligencia Cuantitativa y Contexto Estructural**.

---

## Inventario de Archivos Archivados

### 1. `trade_watcher_daemon.py`
* **Fecha de Creación Original:** Agosto 2026 (Roadmap v2.0 - Fase 3).
* **Fecha de Archivado:** 15 de Septiembre de 2026 (MAS v1.1.0 / TECH-01).
* **Propósito Original:**
  Daemon asíncrono (`asyncio`) de supervisión tick a tick de órdenes en MetaTrader 5 (Exness ECN). Gestionaba estados de señales (`PENDING`, `ACTIVE`, `HIT_TP1`, `CLOSED_TP/SL/BE`), cálculo de trailing stops a Breakeven y persistencia de estados en `data/trade_watcher_state.json`.
* **Motivo del Archivado:**
  1. Abandono definitivo del modelo de ejecución de órdenes y prop-firms (eliminación de riesgos de slippage, desconexión de sockets IPC y restricciones contractuales de cuentas de fondeo).
  2. Sustitución por la arquitectura **Harness Sentinel** (`scripts/quant/harness_sentinel.py`) y el **AI Trader Journal** (`scripts/ai/trader_journal_harness.py`), que operan sin acoplamiento a brokers externos.
