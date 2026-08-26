"""
==============================================================================
AEON Quantitative Lab — Developing POC (dPOC) & Developing VWAP Engine
==============================================================================
Gobernanza: docs/AEON_QUANT_AUDIT.md & docs/AEON_ROADMAP_V2.md (Fase 2)
Objetivo: Eliminar Look-Ahead Bias mediante cálculo estrictamente acumulativo
          de Volume Profile (dPOC) y VWAP barra a barra (t <= current_bar).
==============================================================================
"""

import numpy as np
from typing import Dict, List, Tuple, Optional


class SessionDevelopingIndicators:
    """
    Calculador determinista de Developing POC y Developing VWAP para sesiones intradía.
    Garantiza CERO acceso a datos futuros (Zero Look-Ahead Bias).
    """

    def __init__(self, price_tick_size: float = 0.10, value_area_pct: float = 0.70):
        """
        :param price_tick_size: Resolución del histograma de precios (ej. 0.10 para Oro, 0.0001 para EUR/USD).
        :param value_area_pct: Porcentaje del Value Area (70% estándar de subasta).
        """
        self.tick_size = price_tick_size
        self.va_pct = value_area_pct
        self.reset_session()

    def reset_session(self):
        """Reinicia acumuladores al inicio de una nueva sesión (Asia / Londres / NY)."""
        self.cum_volume = 0.0
        self.cum_pv = 0.0  # Suma de (Precio Tipico * Volumen)
        self.profile: Dict[float, float] = {}  # Histograma de Precio -> Volumen acumulado
        self.dpoc_history: List[float] = []
        self.dvwap_history: List[float] = []

    def _quantize_price(self, price: float) -> float:
        """Cuantiza el precio al escalón de tick más cercano."""
        return round(round(price / self.tick_size) * self.tick_size, 6)

    def process_bar(self, high: float, low: float, close: float, volume: float) -> Dict[str, float]:
        """
        Procesa una sola barra OHLCV acumulando el perfil hasta este instante t.
        
        :param high: Precio máximo de la barra.
        :param low: Precio mínimo de la barra.
        :param close: Precio de cierre de la barra.
        :param volume: Volumen (o tick volume) de la barra.
        :return: Diccionario con dPOC, dVWAP, VAH y VAL acumulados hasta esta barra.
        """
        typical_price = (high + low + close) / 3.0
        
        # 1. Acumular VWAP en tiempo t
        self.cum_volume += volume
        self.cum_pv += typical_price * volume
        dvwap = self.cum_pv / self.cum_volume if self.cum_volume > 0 else typical_price
        self.dvwap_history.append(dvwap)

        # 2. Distribuir volumen uniformemente en el rango de la barra para el Volume Profile
        low_q = self._quantize_price(low)
        high_q = self._quantize_price(high)
        
        ticks_in_bar = max(1, int(round((high_q - low_q) / self.tick_size)) + 1)
        vol_per_tick = volume / float(ticks_in_bar)

        curr_p = low_q
        while curr_p <= high_q + 1e-9:
            q_price = round(curr_p, 6)
            self.profile[q_price] = self.profile.get(q_price, 0.0) + vol_per_tick
            curr_p += self.tick_size

        # 3. Encontrar Developing Point of Control (dPOC) acumulado hasta t
        dpoc = max(self.profile.keys(), key=lambda p: self.profile[p])
        self.dpoc_history.append(dpoc)

        # 4. Calcular Value Area (VAH / VAL) acumulado
        sorted_levels = sorted(self.profile.items(), key=lambda item: item[1], reverse=True)
        target_va_vol = self.cum_volume * self.va_pct
        accum_va_vol = 0.0
        va_prices = []

        for p, vol in sorted_levels:
            va_prices.append(p)
            accum_va_vol += vol
            if accum_va_vol >= target_va_vol:
                break

        vah = max(va_prices) if va_prices else dpoc
        val = min(va_prices) if va_prices else dpoc

        return {
            'dpoc': dpoc,
            'dvwap': dvwap,
            'vah': vah,
            'val': val,
            'cum_volume': self.cum_volume
        }


# ==============================================================================
# TEST DE VERIFICACIÓN DE LOOK-AHEAD BIAS
# ==============================================================================
def verify_zero_lookahead_bias():
    """
    Demuestra formalmente que el resultado en la barra N es invariante
    respecto a si existen o no barras posteriores en el dataset.
    """
    np.random.seed(42)
    n_bars = 100
    prices = 2650.0 + np.cumsum(np.random.randn(n_bars) * 1.5)
    highs = prices + np.abs(np.random.randn(n_bars) * 0.8)
    lows = prices - np.abs(np.random.randn(n_bars) * 0.8)
    volumes = np.random.randint(100, 1000, size=n_bars).astype(float)

    # Corrida 1: Ejecutar hasta barra 50
    engine1 = SessionDevelopingIndicators(price_tick_size=0.10)
    res_at_50_run1 = None
    for i in range(50):
        res_at_50_run1 = engine1.process_bar(highs[i], lows[i], prices[i], volumes[i])

    # Corrida 2: Ejecutar las 100 barras completas
    engine2 = SessionDevelopingIndicators(price_tick_size=0.10)
    res_at_50_run2 = None
    for i in range(n_bars):
        out = engine2.process_bar(highs[i], lows[i], prices[i], volumes[i])
        if i == 49:
            res_at_50_run2 = out

    # Comprobación de invariancia matemática
    assert res_at_50_run1 == res_at_50_run2, "CRITICAL ERROR: Look-ahead bias detected in indicator engine!"
    print("[PASS] Test de Cero Look-Ahead Bias superado exitosamente.")
    print(f"       dPOC en barra 50 (Truncada): {res_at_50_run1['dpoc']}")
    print(f"       dPOC en barra 50 (Completa): {res_at_50_run2['dpoc']}")
    print(f"       dVWAP en barra 50: {res_at_50_run1['dvwap']:.4f}")


if __name__ == '__main__':
    verify_zero_lookahead_bias()
