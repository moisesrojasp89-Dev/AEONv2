# AEON — Quantitative Lab Standards & Scientific Backtesting Specification

**Documento:** `docs/AEON_QUANT_LAB_SPEC.md`  
**Estado:** Norma Técnica de Investigación y Validación Cuantitativa  
**Versión:** 1.0 (Fase 2 de Roadmap v2.0)  
**Fecha:** 25 de Agosto de 2026  
**Gobernanza:** [`docs/AEON_QUANT_AUDIT.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_QUANT_AUDIT.md) & [`docs/AEON_ROADMAP_V2.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_ROADMAP_V2.md)  

---

## 1. Alcance y Principios Científicos Obligatorios

Este documento establece los estándares matemáticos, metodológicos y de modelado financiero que **deben cumplir todas las estrategias algorítmicas de AEON** antes de ser desplegadas en cuentas reales o de emitir señales a usuarios.

### Principios Rectores:
1. **Cero Look-Ahead Bias:** Ningún indicador, normalizador o agregador puede acceder a datos posteriores a la barra actual ($t \le \text{current\_bar}$).
2. **Deducción de Fricciones Reales:** Todo backtest debe deducir obligatoriamente comisiones de broker, spreads dinámicos por sesión y slippage estocástico en órdenes Stop.
3. **Validación Fuera de Muestra (Out-of-Sample):** Ningún parámetro se considera válido sin superar el análisis Walk-Forward ($WFE \ge 65\%$) y la prueba de Monte Carlo (1.000 iteraciones).
4. **Honestidad Taxonómica:** Prohibido etiquetar el volumen de ticks de brokers retail (Exness / OANDA) como "Order Flow Centralizado", "Footprint" o "Delta". En la fase actual se definen como *Price-Action Volume Proxies*.

---

## 2. Estándar de Integridad de Datos e Indexación Temporal

| Dimensión | Requisito Cuantitativo Obligatorio | Script de Verificación |
|---|---|:---:|
| **Zona Horaria** | Estrictamente **UTC (ISO 8601)** en todo el dataset de 90.000 velas de Exness. | `scripts/quant/dpoc_engine.py` |
| **Ventana de Rollover** | Excluir aperturas y entradas entre **21:45 UTC y 23:15 UTC** (iliquidez interbancaria). | Filtro de ejecución |
| **Gaps de Fin de Semana** | Velas dominicales previas a las 21:00 UTC son filtradas para evitar distorsiones de VWAP. | Preprocesador de datos |
| **Normalización de Ticks** | Cuantización de niveles de precio por tick size: **0.10 para Oro ($XAU$)**, **0.0001 para $EUR/USD$ y $GBP/USD$**. | `_quantize_price()` |

---

## 3. Formulación Matemática: Developing POC y Developing VWAP

```text
DESARROLLO DE INDICADORES EN TIEMPO REAL (t <= current_bar):

1. Developing VWAP (dVWAP):
   dVWAP(t) = ∑_{i=0}^t [ TypicalPrice(i) * Volume(i) ] / ∑_{i=0}^t [ Volume(i) ]
   donde TypicalPrice(i) = (High(i) + Low(i) + Close(i)) / 3

2. Developing Point of Control (dPOC):
   dPOC(t) = argmax_{Price_Level} [ Profile_Histogram(Price_Level, t) ]
   donde Profile_Histogram se acumula barra a barra distribuyendo el volumen
   de cada vela en sus ticks interiores [Low_q .. High_q].
```

### Código de Referencia Validado:
El módulo [`scripts/quant/dpoc_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/dpoc_engine.py) contiene la implementación de referencia con prueba unitaria que certifica Cero Look-Ahead Bias:

```bash
python scripts/quant/dpoc_engine.py
# [PASS] Test de Cero Look-Ahead Bias superado exitosamente.
```

---

## 4. Matriz de Fricciones Reales de Mercado

Para cuentas **Exness Raw Spread / Zero**, todo backtest debe deducir los siguientes costes parametrizados en [`scripts/quant/backtest_friction_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/backtest_friction_engine.py):

| Componente de Coste | Parámetro en Backtest | Justificación de Mercado |
|---|:---:|---|
| **Comisión de Broker** | **$\$7.00$ / lote estándar** (ida y vuelta) | Tarifa estándar de cuentas ECN / Raw Spread de Exness. |
| **Spread Base (Londres/NY)** | **$1.2$ pips** (Oro: $0.12$ USD, Euro: $0.00012$) | Spread medio durante Killzones de alta liquidez. |
| **Spread Rollover (21:45-23:15 UTC)** | **$4.5\times$ base ($5.4$ pips)** | Ensanchamiento típico por cierre bancario en NY. |
| **Slippage Estocástico** | Distribución Gamma ($\mu = 0.8$ pips) | Deslizamiento de precio en ejecuciones Stop Loss con volatilidad. |
| **Financiamiento Nocturno (Swap)** | **$-\$1.50$ / lote / día** | Coste de margen para trades que cruzan la medianoche UTC. |

### Impacto en la Rentabilidad Neta:
$$PnL_{Neto} = PnL_{Bruto} - (\text{Comisión} + \text{Spread Dinámico} + \text{Slippage} + \text{Swap})$$

---

## 5. Protocolo de Validación Científica y Walk-Forward Analysis (WFO)

```text
DIVISIÓN DE DATOS HISTÓRICOS (90.000 Velas):
┌───────────────────────────────────────────────┬───────────────────────┬───────────────────────┐
│ In-Sample (Entrenamiento: 60%)                │ Validation (20%)      │ Out-of-Sample (20%)   │
│ Optimización de parámetros (ADX N, VWAP std)  │ Selección de modelos  │ Prueba Ciega Final    │
└───────────────────────────────────────────────┴───────────────────────┴───────────────────────┘
```

### 1. Walk-Forward Efficiency (WFE):
Se ejecutan 5 a 10 ventanas móviles sobre el histórico de datos:
$$WFE = \frac{\text{Rendimiento Medio Out-of-Sample}}{\text{Rendimiento Medio In-Sample}} \times 100$$
* **Criterio de Certificación:** $WFE \ge 65.0\%$. Un $WFE < 65\%$ indica que la estrategia está memorizando ruido pasado.

### 2. Simulación de Monte Carlo (Stress Testing de 1.000 Iteraciones):
Implementado en [`scripts/quant/walk_forward_validator.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/walk_forward_validator.py):
* Permutación aleatoria del orden de las operaciones para simular rachas desfavorables de mercado.
* Aplicación de un factor de choque de slippage de $+15\%$ en todas las operaciones perdedoras.
* **Criterios de Aprobación Institucional:**
  * **Mediana de Max Drawdown:** $\le 8.0\%$
  * **Percentil 95 de Max Drawdown:** $\le 12.0\%$
  * **Probabilidad de Drawdown $> 15.0\%$:** $< 1.0\%$

---

## 6. Checklist de Certificación Cuantitativa (Fase 2 Completada)

- [x] Motor de cálculo Developing POC y Developing VWAP implementado y libre de Look-Ahead Bias ([`scripts/quant/dpoc_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/dpoc_engine.py)).
- [x] Simulador de fricciones reales y comisiones ECN de Exness activo ([`scripts/quant/backtest_friction_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/backtest_friction_engine.py)).
- [x] Validador de Walk-Forward y simulador de Monte Carlo (1.000 corridas) operativo ([`scripts/quant/walk_forward_validator.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/walk_forward_validator.py)).
- [x] Separación conceptual rigurosa entre CFD Tick Volume y Futuros Centralizados documentada.
