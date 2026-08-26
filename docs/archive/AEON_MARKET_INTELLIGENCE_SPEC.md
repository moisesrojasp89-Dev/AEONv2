# AEON — Market Intelligence, Regime & Explainable Scoring Specification

**Documento:** `docs/AEON_MARKET_INTELLIGENCE_SPEC.md`  
**Estado:** Especificación Técnica de Inteligencia de Mercado  
**Versión:** 1.0 (Fase 4 de Roadmap v2.0)  
**Fecha:** 25 de Agosto de 2026  
**Gobernanza:** [`docs/AEON_QUANT_AUDIT.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_QUANT_AUDIT.md) & [`docs/AEON_ROADMAP_V2.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/AEON_ROADMAP_V2.md)  
**Módulos de Código:** [`scripts/quant/market_intelligence.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/market_intelligence.py)  

---

## 1. Visión General y Arquitectura

El subsistema **AEON Market Intelligence** transforma la generación de señales técnicas aisladas en un sistema holístico que sintetiza:
1. **Dinámica de Subasta Intradía** (Developing POC y Session VWAP).
2. **Régimen Multivariado de Mercado** (ADX calibrado $N=14$, ATR relativo y alineación de medias).
3. **Contexto Macroeconómico** (Protección contra noticias de alto impacto y sesgos de divisas).
4. **Timing de Liquidez Institucional** (Killzones de Londres y Nueva York).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ AEON MARKET INTELLIGENCE FRAMEWORK                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ 1. Auction Structure Engine    ➔ Developing POC + Developing VWAP (0-35) │
│ 2. Multivariate Regime Engine  ➔ ADX (N=14) + ATR + MA Alignment  (0-25) │
│ 3. Macro Calendar Correlator   ➔ High-Impact Blackout (+-15 min)  (0-25) │
│ 4. Killzone Timing Filter      ➔ London/NY Session Liquidity      (0-15) │
├──────────────────────────────────────────────────────────────────────────┤
│ RESULTADO: Score Institucional 0–100 + Desglose Explicable + Tesis Clara │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detector Multivariado de Régimen de Mercado

Para superar el sobreajuste del detector $N=3$, se utiliza un modelo de 3 capas implementado en `MarketRegimeDetector`:

| Parámetro / Capa | Valor / Regla de Activación | Función Técnica |
|---|---|---|
| **ADX de Welles Wilder** | Periodo $N=14$ (Umbral tendencia $\ge 25.0$) | Filtra mercados laterales y mide inercia tendencial real. |
| **Alineación de Medias** | Precio $> \text{SMA}_{20} > \text{SMA}_{50}$ (Bullish) | Confirma la dirección de la tendencia en el timeframe base. |
| **Volatilidad Relativa** | $\text{ATR}_{14} / \text{Precio} \times 1000$ | Detecta compresión de rango vs expansión anómala de riesgo. |

### Taxonomía de Regímenes:
* **`TREND_BULL` (Tendencia Alcista):** $ADX \ge 25$, $+DI > -DI$, Precio sobre medias. Apto para compras de continuación.
* **`TREND_BEAR` (Tendencia Bajista):** $ADX \ge 25$, $-DI > +DI$, Precio bajo medias. Apto para ventas de continuación.
* **`RANGE_COMPRESSION` (Rango / Compresión):** $ADX < 20$. Apto exclusivamente para reversión a la media en dPOC / dVWAP.
* **`HIGH_VOL_CHOP` (Volatilidad Mixta):** Descalce de medias y picos erráticos de ATR. **Operativa bloqueada (No Tradable)**.

---

## 3. Matriz de Puntuación Institucional Explicable (0 a 100)

Toda señal emitida debe alcanzar un **Score $\ge 70$** para ser autorizada en el terminal PRO:

```text
PUNTUACIÓN TOTAL = P_Subasta (35) + P_Régimen (25) + P_Macro (25) + P_Sesión (15)
```

| Factor Evaluado | Puntos Máximos | Criterio de Puntuación |
|---|:---:|---|
| **Estructura de Subasta** | **35 pts** | Rebote en dPOC ($\le 25$ pips): $+20$ pts.<br>Soporte/Resistencia dinámica en dVWAP: $+15$ pts. |
| **Régimen y Momentum** | **25 pts** | Alineación perfecta con tendencia ($ADX \ge 25$): $+25$ pts.<br>Régimen de compresión válido para reversión: $+18$ pts.<br>Volatilidad mixta: penalización a $+0$ pts. |
| **Contexto Macroeconómico** | **25 pts** | Ventana despejada sin noticias de alto impacto: $+20$ pts.<br>Sesgo macroeconómico favorable: $+5$ pts.<br>**Blackout activo ($\pm 15$ min):** $-100$ pts (Bloqueo absoluto). |
| **Timing de Killzone** | **15 pts** | Apertura de Londres (07:00–10:00 UTC): $+15$ pts.<br>Apertura de Nueva York (12:00–15:00 UTC): $+15$ pts.<br>Sesión Asiática: $+8$ pts.<br>Rollover bancario (21:45–23:15 UTC): $0$ pts. |

---

## 4. Correlación Macroeconómica y Regla de Blackout

El correlador `MacroCalendarCorrelator` monitorea en tiempo real la tabla `economic_calendar` de Supabase:

1. **Protocolo de Protección por Blackout:**  
   Si se detecta un evento clasificado como `HIGH` o `HIGH IMPACT` (ej. CPI, Non-Farm Payrolls, FOMC, Tasas de Interés BCE/BoE) programado dentro de un intervalo de **$\pm 15$ minutos** respecto a la hora UTC actual:
   * El sistema genera una alerta: `is_in_blackout = True`.
   * El score macroeconómico se anula a $0.0$ y la señal se marca como **`is_valid_setup = False`**.
   * Se previene la apertura de nuevas posiciones durante picos de spread y deslizamiento extremo.

2. **Mapeo de Impacto por Divisa / Activo:**
   * Eventos de **EE.UU. (USD):** Afectan directamente a `XAU_USD`, `EUR_USD`, `GBP_USD`, `SPX500_USD`, `NAS100_USD`, `US30_USD`.
   * Eventos de la **Eurozona (EUR):** Afectan a `EUR_USD`.
   * Eventos de **Reino Unido (GBP):** Afectan a `GBP_USD`.

---

## 5. Tesis Institucional Generada Automáticamente

Cada señal procesada por el motor incorpora un campo `institutional_thesis` que se presenta directamente en las tarjetas de la interfaz:

> *"Oportunidad en XAU_USD (BUY) respaldada por Rebote en Volume Profile dPOC, confluencia de TENDENCIA ALCISTA y liquidez de sesión de Londres (Score institucional: 88/100)."*
