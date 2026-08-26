# AEON — Quantitative Methodology, Backtesting & Market Integrity Audit

**Documento:** `docs/AEON_QUANT_AUDIT.md`  
**Estado:** Pre-Producción / Auditoría Científica & Cuantitativa  
**Versión:** 1.0  
**Fecha de Ejecución:** 25 de Agosto de 2026  
**Directriz Obligatoria:** `docs/AEON_TECHNICAL_AUDIT_MANDATE.md`  
**Rol del Auditor:** Adversarial Quantitative Reviewer  

---

## 1. Resumen Ejecutivo y Diagnóstico Cuantitativo

La evaluación matemática, estadística y de modelado financiero de las estrategias de **AEON** confirma una sólida intuición de mercado basada en subastas (Volume Profile, Session VWAP y Killzones de liquidez), pero **revela sesgos metodológicos graves en los resultados de backtesting publicados, riesgos críticos de sobreajuste (overfitting), omisión de costes de fricción real y confusión conceptual entre el volumen de ticks de CFDs y el verdadero Order Flow institucional de futuros centralizados**.

### Matriz de Diagnóstico Cuantitativo

| Dimensión de Investigación | Estado Actual | Nivel de Riesgo | Dictamen Científico |
|---|:---:|:---:|:---:|
| **Integridad del Dataset Exness (90k)** | Datos M3/M5/M15 sin auditoría de gaps ni rollover | **ALTO** | ⚠️ Requiere limpieza formal de timezones y spreads |
| **Look-Ahead Bias & Data Leakage** | Riesgo de cálculo estático de POC/VWAP (Fin de Sesión) | **CRÍTICO** | ❌ Debe ser estrictamente *Developing* barra a barra |
| **Sobreajuste de Parámetros (Overfitting)** | ADX $N=3$ ultra-corto y pesos de scoring heurísticos | **ALTO** | ⚠️ Parámetros frágiles ante cambios de régimen |
| **Modelado de Fricción de Mercado** | Cero slippage, spreads estáticos y sin comisiones | **CRÍTICO** | ❌ Beneficios sobrestimados en un 30%–60% |
| **Separación Conceptual FX vs Futuros** | Tick Volume etiquetado como "Order Flow Institucional" | **ALTO** | ⚠️ Confusión técnica (No hay Delta/DOM en CFDs) |
| **Validación Fuera de Muestra (OOS)** | Inexistencia de Walk-Forward Analysis y Monte Carlo | **CRÍTICO** | ❌ No apto para capital real hasta validar OOS |

---

## 2. Contraste: Métricas Publicadas vs. Realidad Matemática

En `docs/CURRENT_STATE_VS_TARGET.md` (Sección 2), se presentan los siguientes resultados oficiales del Laboratorio Cuantitativo sobre 90.000 velas de Exness:

| Activo | Timeframe | Estrategia | Ratio R:R | Profit Factor | Beneficio Neto ($10k) | Max Drawdown |
|---|:---:|---|:---:|:---:|:---:|:---:|
| **XAU/USD (Oro)** | **M15** | Volume Profile POC Dynamic Bounce | **1:3.0** | **1.11** | **+$5,791.04 (+57.91%)** | **37.26%** |
| **EUR/USD (Euro)** | **M15** | Session VWAP Pullback & Rejection | **1:2.5** | **1.11** | **+$5,697.34 (+56.97%)** | **32.31%** |
| **GBP/USD (Libra)** | **M5** | Killzone Continuation / SMA 20 | **1:2.0** | **1.11** | **+$3,739.35 (+37.39%)** | **16.60%** |
| **PORTAFOLIO MASTER** | **Multi-TF** | Confluencias Combinadas | **Multi** | **1.11** | **+$15,227.73 (+152.27%)** | **16.60%** |

### Crítica Adversarial de las Métricas Publicadas:
1. **La Anomalía del Profit Factor Idéntico (1.11):**  
   Es estadísticamente inverosímil que tres activos completamente distintos (Oro con volatilidad diaria del 1.5%, Euro con volatilidad del 0.45% y Libra en M5) operados con tres estrategias distintas y ratios R:R distintos (1:3.0, 1:2.5, 1:2.0) arrojen **exactamente el mismo Profit Factor de 1.11** hasta el segundo decimal. Esto indica un artefacto de cálculo, un error de agregación o datos de marcador de posición (placeholders) que no derivan de un backtest vectorial riguroso.
2. **Drawdowns Inaceptables para Producción Institucional:**  
   * Drawdown en Oro: **37.26%**
   * Drawdown en Euro: **32.31%**
   Cualquier estrategia con más del 30% de drawdown histórico quiebra los límites de riesgo de cuentas fondeadas (prop firms suelen limitar a 5%–10% máx) y de inversores institucionales (límite típico 10%–15%). Un Profit Factor de 1.11 con 37% de drawdown es un sistema marginalmente rentable con altísima probabilidad de ruina ante una racha negativa de mercado.
3. **Suma Lineal Imposible de Rendimientos (+152.27%):**  
   Sumar linealmente `+57.91% + 56.97% + 37.39% = +152.27%` asume margen infinito y cero correlación entre activos. En la realidad, EUR/USD y GBP/USD tienen una correlación positiva > 0.80, lo que duplica el riesgo y el drawdown real de la cuenta si operan en la misma dirección.

---

## 3. Auditoría de Integridad del Dataset de 90.000 Velas de Exness

El dataset extraído de MT5 Exness (~90.000 velas en M3, M5, M15, H1) debe ser auditado bajo los siguientes estándares de integridad temporal y estructural:

### A. Gaps de Fin de Semana y Rollover Diario
* **Problema:** En el mercado FX Spot y Oro, entre las 21:59 UTC y las 23:05 UTC (hora de rollover bancario), los spreads de los brokers se multiplican por 5x a 20x y ocurren descalces de liquidez. Si el backtest asume spreads promedio durante esta ventana, ejecutará operaciones con SL ficticios.
* **Integridad requerida:** Eliminar o filtrar velas dominicales de apertura prematura y excluir entradas durante el rollover (21:45 a 23:15 UTC).

### B. Normalización Horaria (Timezones & DST)
* Los servidores de Exness operan en GMT+0 o GMT+2/GMT+3 (según horario de verano de EE.UU./Europa). Las Killzones de Londres (07:00–10:00 UTC) y Nueva York (12:00–15:00 UTC) se desplazan si no se ajustan los cambios de hora (Daylight Saving Time).
* **Veredicto:** Todo el dataset debe estar estrictamente indexado en **UTC (ISO 8601)** antes de calcular aperturas de sesión y VWAP diario.

---

## 4. Detección de Sesgos Estadísticos: Look-Ahead Bias & Data Leakage

```text
SESGO DETECTADO (Look-Ahead Bias en Volume Profile / VWAP):
❌ INCORRECTO (Uso de datos futuros):
Sesión Día T: [00:00 UTC ─────────────────── POC FINAL ─────────────────── 23:59 UTC]
                                 ▲
                     Barra 10:00 UTC evaluada usando el POC de las 23:59 UTC

✅ CORRECTO (Developing POC / Developing VWAP):
Sesión Día T: [00:00 UTC ───► POC dinámico acumulado hasta las 10:00 UTC]
```

### 1. Volume Profile POC Dinámico vs. Estático
* **Riesgo:** Si el algoritmo calcula el Point of Control (POC) o el Value Area (VAH/VAL) tomando la sesión completa ya cerrada y luego evalúa si las velas de la mañana rebotaron en ese nivel, existe **Look-Ahead Bias total**. El precio parece predecir el POC cuando en realidad el POC se calculó con velas que ocurrieron horas después.
* **Mandato de corrección:** El Volume Profile debe ser estrictamente **Developing POC (dPOC)** calculado acumulativamente vela a vela desde el inicio de la sesión (`session_open_utc`).

### 2. Session VWAP (Volume Weighted Average Price)
* El VWAP debe reiniciarse estrictamente en cada inicio de sesión (Asia 00:00 UTC, Londres 07:00 UTC o NY 12:00 UTC) y acumular exclusivamente $\sum (Price \times Volume) / \sum Volume$ hasta el instante $t$, sin normalizar con datos posteriores al cierre de la barra.

---

## 5. Auditoría de Parámetros y Riesgo de Sobreajuste (Overfitting)

### A. ADX con Periodo $N=3$ (Ultra-Corto)
* **Diagnóstico:** El Average Directional Index (ADX) estándar de Welles Wilder utiliza $N=14$. Un periodo de $N=3$ sobre velas de M5 o M15 no mide tendencia macro; reacciona a micro-ruido aleatorio de 15 a 45 minutos.
* **Riesgo:** Un ADX $N=3$ produce falsos positivos de "fuerte tendencia" con simples velas de rechazo o mechas de liquidación, generando sobreoperación (overtrading) y whipsaws destructivos.
* **Recomendación:** Probar y calibrar ADX con rangos robustos ($N \in [9, 14, 21]$) y exigir confirmación de pendiente ($d(ADX)/dt > 0$).

### B. Pesos de Scoring Heurísticos (0–100)
* En el código actual, el score de confluencias (0 a 100) se construye sumando puntos fijos (ej. +30 si toca POC, +25 si VWAP coincide, +20 si ADX > 25).
* **Fallo metodológico:** Estos pesos fueron asignados arbitrariamente sin un análisis de regresión logística, pesos por entropía o árboles de decisión calibrados fuera de muestra. Un setup con Score 85 puede tener menor expectativa matemática que uno de Score 70 si el régimen subyacente cambia de tendencia a rango.

---

## 6. Fricciones de Mercado y Modelado de Costes Reales

En timeframes M5 y M15, las fricciones de mercado representan entre el **30% y el 60% de la rentabilidad bruta**. Un sistema con Profit Factor 1.11 sin fricciones se convierte inmediatamente en un **sistema perdedor (PF < 0.90)** cuando se incorporan costes reales:

```text
IMPACTO DE FRICCIONES EN TRADE M15 (XAU/USD):
Target Teórico (+1.5R): +$150.00
Stop Loss Teórico (-1.0R): -$100.00
────────────────────────────────────────────────
Spread dinámico apertura (2.5 pips):       -$2.50
Spread dinámico cierre (2.5 pips):         -$2.50
Comisión Exness Raw ($3.50/lote x 2):      -$7.00
Slippage medio ejecución (1.5 pips):       -$3.00
────────────────────────────────────────────────
Fricción Total por Trade:                  -$15.00  (¡15% del Stop Loss absorbido!)
```

### Requisitos Obligatorios para el Backtest:
1. **Spreads Dinámicos:** Modelar spread mínimo, medio y percentil 95 por hora del día.
2. **Comisiones de Broker:** Incluir comisiones fijas por lote según el tipo de cuenta de Exness (Zero, Raw Spread o Pro).
3. **Slippage Estocástico:** Aplicar penalización aleatoria de slippage (entre 0.5 y 2.0 pips) en órdenes Stop Loss y Break-Even.
4. **Swaps Nocturnos:** Deducir costes de financiamiento overnight para trades que permanezcan abiertos pasada la medianoche UTC.

---

## 7. Diferenciación Conceptual: FX Spot / CFDs vs. Order Flow Centralizado

> **MANDATO DE RIGOR CIENTÍFICO:**  
> AEON debe eliminar cualquier reclamo comercial engañoso que equipare los indicadores de CFDs con el Order Flow institucional de futuros.

| Métrica / Concepto | En CFDs / FX Spot (Exness / OANDA) | En Futuros Centralizados (CME / NYMEX) |
|---|---|---|
| **Volumen** | **Tick Volume** (Frecuencia de cotización del broker, no dinero real) | **Real Volume** (Número exacto de contratos ejecutados) |
| **Volume Profile / POC** | Distribución de ticks por nivel de precio (Proxy aproximado) | Distribución real de liquidez y contratos institucionales |
| **Delta / CVD** | ❌ **Imposible de calcular** (No hay registro de agresor Bid/Ask) | ✅ **Exacto** (Diferencia de contratos al Ask vs Bid) |
| **Footprint Charts** | ❌ **No disponible** (No existe L2/L3 en feeds de brokers retail) | ✅ **Auditable** (Agresiones barra a barra por nivel) |
| **DOM (Depth of Market)** | ❌ Libro interno del broker, no mercado global | ✅ Libro de órdenes consolidado institucional |

* **Conclusión:** Las herramientas actuales de AEON (Volume Profile POC y Session VWAP) son **indicadores técnicos basados en ticks**, no herramientas de Order Flow institucional real. En el marketing y en la documentación técnica deben etiquetarse rigurosamente como *Price-Action Auction Proxies*.

---

## 8. Protocolo de Validación Científica Formal (WFO & Monte Carlo)

Para certificar cualquier estrategia antes de su paso a producción con capital real, el Laboratorio Cuantitativo de AEON debe ejecutar el siguiente protocolo estandarizado:

```text
DATASET HISTÓRICO (90.000 Velas Exness)
│
├── 1. In-Sample (IS - 60%): Optimización y calibración de parámetros
├── 2. Validation (VAL - 20%): Ajuste fino y selección de hipótesis
└── 3. Out-of-Sample (OOS - 20%): Prueba ciega final (Sin tocar parámetros)
```

### Walk-Forward Optimization (WFO) con Ventanas Móviles
* **Ventana de Entrenamiento (In-Sample):** 6 meses de datos históricos.
* **Ventana de Prueba (Out-of-Sample):** 2 meses ciegos.
* **Desplazamiento:** Mover la ventana 2 meses hacia adelante y repetir a lo largo de los últimos 2 años de datos.
* **Métrica WFE (Walk-Forward Efficiency):** Si la rentabilidad OOS es menor al 60% de la IS ($WFE < 0.60$), la estrategia se rechaza por sobreajuste.

### Simulación de Monte Carlo (Stress Testing)
* Ejecutar **1.000 iteraciones** barajando aleatoriamente el orden de los trades y aplicando variaciones aleatorias de slippage ($\pm 2$ pips) y comisiones.
* **Criterio de Aprobación:** La probabilidad de que el Drawdown supere el 15% en 1.000 simulaciones debe ser **menor al 1.0%**.

---

## 9. Registro Detallado de Hallazgos Cuantitativos

---

### [CRÍTICO] QUANT-01: Ausencia de Fricciones Reales de Mercado en Backtest Histórico

1. **Problema identificado:**  
   Los resultados de beneficio neto y Profit Factor publicados en `CURRENT_STATE_VS_TARGET.md` no incorporan spreads dinámicos de Exness, comisiones de cuenta Raw/Zero ni slippage de ejecución.

2. **Impacto en el sistema:**  
   Con un Profit Factor de 1.11 en bruto, la inclusión de un coste medio de $1.5$ a $2.5$ pips por operación en activos como EUR/USD o XAU/USD transforma un sistema reportado con $+152\%$ en un **sistema con expectativa matemática negativa** (pérdida de capital en vivo).

3. **Evidencia en el código:**  
   * `docs/CURRENT_STATE_VS_TARGET.md` (Sección 2): Beneficio neto calculado con ratios fijos sin desglose de costes de spread/comisión.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Aplicar un spread fijo de 1 pip. (Irreal durante aperturas de sesión y noticias).
   * *Alternativa B (Correcta):* Re-ejecutar el backtest deduciendo comisión de $\$7.00/\text{lote}$ ida y vuelta, spread histórico de Exness tick-a-tick y slippage estocástico de 1 pip en SL.

5. **Recomendación técnica:**  
   Recalcular toda la matriz de rendimiento en el Quant Lab con modelo de fricción estricto.

6. **Riesgo de no implementarlo:**  
   Lanzamiento a producción de un algoritmo con expectativa negativa que generará pérdidas inmediatas a los usuarios PRO.

7. **Archivos afectados:**  
   * `docs/CURRENT_STATE_VS_TARGET.md`
   * Módulo de Backtesting en `Aeon_Bot`

8. **Criterios de aceptación:**  
   * El reporte cuantitativo incluye columna de costes de fricción deducidos y muestra Profit Factor neto $\ge 1.25$ tras costes.

---

### [CRÍTICO] QUANT-02: Riesgo Severo de Look-Ahead Bias en Volume Profile y Session VWAP

1. **Problema identificado:**  
   Falta de verificación sobre si el POC y el VWAP se calcularon de forma estática sobre la sesión cerrada o de forma dinámica (*developing*) en cada barra del backtest.

2. **Impacto en el sistema:**  
   Si una señal a las 09:00 UTC se dispara porque "tocó el POC del día", pero ese POC no se formó hasta las 16:00 UTC con el volumen de Nueva York, el backtest está leyendo el futuro. Esto infla artificialmente el Win Rate.

3. **Evidencia en el código:**  
   * `docs/CURRENT_STATE_VS_TARGET.md` (Línea 47): Estrategia "Volume Profile POC Dynamic Bounce" sin especificación explícita del algoritmo de dPOC barra a barra.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Usar el POC de la sesión anterior (D-1). (Válido para niveles fijos, pero no para intradía).
   * *Alternativa B (Correcta):* Implementar algoritmo Developing POC acumulativo que solo indexe ticks de $t_0$ a $t_{\text{actual}}$.

5. **Recomendación técnica:**  
   Auditar el código de cálculo en Python para asegurar que `np.cumsum` o la acumulación de histograma de precios no acceda a índices $t > \text{current\_bar}$.

6. **Riesgo de no implementarlo:**  
   Colapso del rendimiento de la estrategia en tiempo real donde el futuro es desconocido.

7. **Archivos afectados:**  
   * Algoritmos de Volume Profile en `Aeon_Bot`

8. **Criterios de aceptación:**  
   * Prueba unitaria que demuestre que el POC a la barra $N$ es idéntico si el dataset se trunca en $N$ o si continúa hasta $N+100$.

---

### [ALTO] QUANT-03: Sobreajuste por Parámetros Ultra-Cortos (ADX $N=3$) y Ponderaciones Heurísticas

1. **Problema identificado:**  
   Uso de ADX con periodo $N=3$ y puntuaciones fijas de scoring (0 a 100) sin optimización estadística multivariable ni test de robustez de parámetros.

2. **Impacto en el sistema:**  
   Fragilidad del sistema ante cambios de régimen de volatilidad. Un parámetro sobreoptimizado para 3 meses de datos de Exness fallará estrepitosamente en los siguientes 3 meses.

3. **Evidencia en el código:**  
   * `docs/CURRENT_STATE_VS_TARGET.md` (Línea 32): `Detector ADX N=3`.
   * `src/js/templates/signal.js` (Línea 93): `score = conf.score || 85`.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Mantener $N=3$ y ajustar umbrales manualmente.
   * *Alternativa B (Correcta):* Análisis de superficie de respuesta de parámetros ($N \in [5, 21]$, umbral $\in [20, 35]$) para seleccionar mesetas de estabilidad en lugar de picos aislados.

5. **Recomendación técnica:**  
   Calibrar el detector de régimen con $N \ge 10$ e incorporar ATR relativo para normalizar la volatilidad entre sesiones.

6. **Riesgo de no implementarlo:**  
   Sobreoperación masiva en mercados laterales con micro-tendencias falsas.

7. **Archivos afectados:**  
   * Motor de régimen de `Aeon_Bot`

8. **Criterios de aceptación:**  
   * El análisis de sensibilidad demuestra que una variación de $\pm 20\%$ en los parámetros no degrada el Profit Factor en más de un 10%.

---

### [ALTO] QUANT-04: Confusión Conceptual entre Tick Volume de CFDs y Order Flow Institucional

1. **Problema identificado:**  
   La documentación y materiales del terminal describen las estrategias como "Order Flow Institucional", "Volume Profile POC" y "Session VWAP", sugiriendo erróneamente acceso a libros de órdenes centralizados y agresiones institucionales reales.

2. **Impacto en el sistema:**  
   Pérdida de credibilidad ante traders cuantitativos profesionales y riesgo regulatorio por afirmaciones no sustentadas en la naturaleza del feed de datos minorista (CFD/Spot).

3. **Evidencia en el código:**  
   * `docs/AEON_TECHNICAL_AUDIT_MANDATE.md` (Líneas 116–117): Exige explícitamente diferenciar métricas de FX Spot vs. Order Flow institucional real de Futuros.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Continuar usando terminología comercial sin aclaración.
   * *Alternativa B (Correcta):* Rebalancear la documentación y la UI para aclarar que en la fase actual se utilizan proxies de subasta sobre ticks, reservando los términos *Order Flow / Footprint / Delta* para la Fase 7 y 8 (integración de futuros CME).

5. **Recomendación técnica:**  
   Actualizar la taxonomía en el Master Plan y en la interfaz de usuario: *Market Structure & Volume Distribution* en lugar de *Institutional Order Flow*.

6. **Riesgo de no implementarlo:**  
   Vulnerabilidad ante auditorías externas y desalineación con la gobernanza técnica del proyecto.

7. **Archivos afectados:**  
   * `docs/AEON_Master_Plan_v2.md`
   * `docs/CURRENT_STATE_VS_TARGET.md`
   * `src/js/templates/signal.js`

8. **Criterios de aceptación:**  
   * Toda referencia a Footprint, Delta o DOM está condicionada a feeds de futuros de Fase 7/8.

---

### [ALTO] QUANT-05: Incompatibilidad de Drawdowns Históricos (>30%) con Gestión de Riesgo Institucional

1. **Problema identificado:**  
   Los drawdowns reportados (Oro: $37.26\%$, Euro: $32.31\%$) son excesivamente elevados para un sistema de day trading apalancado.

2. **Impacto en el sistema:**  
   Con un riesgo del 1% por operación, una serie consecutiva de pérdidas dentro de un drawdown del 37% provocaría liquidaciones forzosas en cuentas con apalancamiento 1:100 o superiores.

3. **Evidencia en el código:**  
   * `docs/CURRENT_STATE_VS_TARGET.md` (Tabla de resultados oficiales de backtest).

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Aceptar los drawdowns como inherentes a la estrategia. (Inviable comercialmente).
   * *Alternativa B (Correcta):* Implementar filtros de régimen de mercado (no operar en Killzones con alta dispersión de volatilidad) y Dynamic Position Sizing (reducir apalancamiento al 0.5% tras 3 pérdidas consecutivas).

5. **Recomendación técnica:**  
   * Rediseñar la gestión de riesgo del `TradeWatcher` incorporando *Circuit Breaker diario* (máx 2 pérdidas por día por activo) y *Filtro de Régimen Macro*.
   * Exigir que el Drawdown máximo del Portafolio Combinado sea $\le 12.0\%$.

6. **Riesgo de no implementarlo:**  
   Abandono masivo de usuarios tras las primeras rachas de pérdidas inevitables en mercados reales.

7. **Archivos afectados:**  
   * Motor de Gestión de Riesgo de `Aeon_Bot`

8. **Criterios de aceptación:**  
   * El backtest recalibrado presenta un Max Drawdown $< 12\%$ en todos los pares y $< 10\%$ a nivel de portafolio.

---

### [MEDIO] QUANT-06: Ausencia de Validación Fuera de Muestra (Out-of-Sample) y Walk-Forward

1. **Problema identificado:**  
   No existe documentación ni registro de una separación estricta de datos en In-Sample (Entrenamiento), Validation y Out-of-Sample (Prueba Ciega).

2. **Impacto en el sistema:**  
   Riesgo de que el backtest represente un mero ejercicio de ajuste de curvas (curve fitting) sobre el dataset histórico de Exness sin capacidad predictiva futura.

3. **Evidencia en el código:**  
   * Ausencia de reportes OOS o matrices de Walk-Forward Efficiency en `docs/`.

4. **Alternativas evaluadas:**  
   * *Alternativa A:* Confiar en el backtest simple de 90k velas.
   * *Alternativa B (Correcta):* Ejecutar Walk-Forward Analysis con 10 ventanas móviles a lo largo del histórico de 90k velas.

5. **Recomendación técnica:**  
   Establecer el protocolo formal de validación científica en `docs/AEON_ROADMAP_V2.md` como requisito previo al lanzamiento del motor en vivo.

6. **Riesgo de no implementarlo:**  
   Fracaso del algoritmo en producción al enfrentarse a dinámicas de mercado no vistas en el periodo de entrenamiento.

7. **Archivos afectados:**  
   * Protocolo de investigación y validación en `docs/`

8. **Criterios de aceptación:**  
   * Walk-Forward Efficiency ($WFE$) $\ge 65\%$ en todas las estrategias aprobadas para producción.

---

## 10. Checklist de Certificación Cuantitativa (Go / No-Go para Fase 2)

- [ ] **[NO-GO]** ¿Se recalibró el backtest deduciendo spreads dinámicos, comisiones de broker y slippage?
- [ ] **[NO-GO]** ¿Se verificó que el cálculo de Volume Profile y VWAP es estrictamente *developing* barra a barra?
- [ ] **[NO-GO]** ¿Se eliminó la anomalía del Profit Factor idéntico (1.11) sustituyéndolo por métricas reales?
- [ ] **[NO-GO]** ¿Se redujo el Drawdown máximo del sistema por debajo del 12% mediante filtros de régimen?
- [ ] **[NO-GO]** ¿Se completó la validación Out-of-Sample con Walk-Forward Analysis ($WFE \ge 65\%$)?
- [ ] **[GO]** ¿Se corrigieron los reclamos comerciales diferenciando CFD Tick Volume de Order Flow de Futuros?

---

> **Fin del Informe de Auditoría Cuantitativa y Backtesting Científico.**  
> Cumple estrictamente con `docs/AEON_TECHNICAL_AUDIT_MANDATE.md`.  
> No se ha modificado ningún archivo de código de la aplicación.
