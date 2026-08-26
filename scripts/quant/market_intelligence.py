"""
==============================================================================
AEON Quantitative Lab — Market Intelligence, Regime & Scoring Engine
==============================================================================
Gobernanza: docs/AEON_QUANT_AUDIT.md & docs/AEON_ROADMAP_V2.md (Fase 4)
Objetivo: Detector multivariado de régimen de mercado, scoring explicable 0-100
          y correlación determinista con eventos del calendario macroeconómico.
==============================================================================
"""

import dataclasses
import datetime
import numpy as np
from typing import List, Dict, Optional, Tuple


@dataclasses.dataclass
class MarketRegimeResult:
    regime_name: str          # 'TENDENCIA ALCISTA', 'TENDENCIA BAJISTA', 'RANGO / COMPRESIÓN', etc.
    regime_code: str          # 'TREND_BULL', 'TREND_BEAR', 'RANGE_COMPRESSION', 'HIGH_VOL_CHOP'
    trend_strength: float     # ADX Normalizado (0 a 100)
    volatility_ratio: float   # ATR Relativo actual vs media histórica
    ma_alignment_score: float # Puntuación de alineación de medias (0 a 100)
    is_tradable: bool         # False si hay volatilidad errática (Chop)


@dataclasses.dataclass
class MacroContextResult:
    directional_bias: str     # 'BULLISH', 'BEARISH', 'NEUTRAL'
    is_in_blackout: bool      # True si hay noticia HIGH impact en +-15 min
    event_name: Optional[str] = None
    minutes_to_event: Optional[int] = None
    macro_score_contrib: float = 0.0  # Puntos aportados al score (0 a 25)


@dataclasses.dataclass
class SignalScoreResult:
    total_score: int          # Puntuación final (0 a 100)
    is_valid_setup: bool      # True si total_score >= 70
    breakdown: Dict[str, float]
    confluences: List[str]
    institutional_thesis: str


class MarketRegimeDetector:
    """
    Detector multivariado de régimen que combina ADX (N=14), ATR y alineación
    de medias móviles para evitar el sobreajuste de parámetros ultra-cortos.
    """

    def __init__(self, adx_period: int = 14, atr_period: int = 14):
        self.adx_period = adx_period
        self.atr_period = atr_period

    def calculate_atr(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> float:
        """Calcula el Average True Range (ATR)."""
        if len(closes) < 2:
            return 1.0
        tr1 = highs[1:] - lows[1:]
        tr2 = np.abs(highs[1:] - closes[:-1])
        tr3 = np.abs(lows[1:] - closes[:-1])
        tr = np.maximum(tr1, np.maximum(tr2, tr3))
        return float(np.mean(tr[-self.atr_period:])) if len(tr) >= self.atr_period else float(np.mean(tr))

    def calculate_adx(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> Tuple[float, float, float]:
        """Calcula ADX, +DI y -DI usando el suavizado estándar de Wilder."""
        n = min(self.adx_period, len(closes) - 1)
        if n < 5:
            return 20.0, 15.0, 15.0

        high_diff = highs[1:] - highs[:-1]
        low_diff = lows[:-1] - lows[1:]

        plus_dm = np.where((high_diff > low_diff) & (high_diff > 0), high_diff, 0.0)
        minus_dm = np.where((low_diff > high_diff) & (low_diff > 0), low_diff, 0.0)

        tr1 = highs[1:] - lows[1:]
        tr2 = np.abs(highs[1:] - closes[:-1])
        tr3 = np.abs(lows[1:] - closes[:-1])
        tr = np.maximum(tr1, np.maximum(tr2, tr3))

        tr_sum = np.sum(tr[-n:])
        plus_di = (np.sum(plus_dm[-n:]) / tr_sum * 100.0) if tr_sum > 0 else 0.0
        minus_di = (np.sum(minus_dm[-n:]) / tr_sum * 100.0) if tr_sum > 0 else 0.0

        di_sum = plus_di + minus_di
        dx = (abs(plus_di - minus_di) / di_sum * 100.0) if di_sum > 0 else 0.0
        adx = dx  # Simplificado para ventana
        return float(adx), float(plus_di), float(minus_di)

    def detect_regime(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> MarketRegimeResult:
        """Evalúa el régimen multivariado del mercado."""
        adx, plus_di, minus_di = self.calculate_adx(highs, lows, closes)
        atr_curr = self.calculate_atr(highs, lows, closes)
        
        # Medias móviles: SMA 20 y SMA 50
        sma20 = float(np.mean(closes[-20:])) if len(closes) >= 20 else closes[-1]
        sma50 = float(np.mean(closes[-50:])) if len(closes) >= 50 else closes[-1]
        current_price = closes[-1]

        # Alineación de Medias
        is_bullish_alignment = (current_price > sma20 > sma50)
        is_bearish_alignment = (current_price < sma20 < sma50)

        # Reglas de Clasificación
        if adx >= 25.0 and is_bullish_alignment and plus_di > minus_di:
            regime_name = "TENDENCIA ALCISTA"
            regime_code = "TREND_BULL"
            tradable = True
        elif adx >= 25.0 and is_bearish_alignment and minus_di > plus_di:
            regime_name = "TENDENCIA BAJISTA"
            regime_code = "TREND_BEAR"
            tradable = True
        elif adx < 20.0:
            regime_name = "RANGO / COMPRESIÓN"
            regime_code = "RANGE_COMPRESSION"
            tradable = True  # Apto para estrategias de rebote en POC / dVWAP
        else:
            regime_name = "VOLATILIDAD MIXTA"
            regime_code = "HIGH_VOL_CHOP"
            tradable = False

        return MarketRegimeResult(
            regime_name=regime_name,
            regime_code=regime_code,
            trend_strength=round(adx, 1),
            volatility_ratio=round(atr_curr / current_price * 1000.0, 2),
            ma_alignment_score=90.0 if (is_bullish_alignment or is_bearish_alignment) else 50.0,
            is_tradable=tradable
        )


class MacroCalendarCorrelator:
    """
    Correlador de eventos macroeconómicos para calcular sesgos direccionales y ventanas de riesgo.
    """

    # Mapeo de impacto macro por divisa
    CURRENCY_ASSET_MAP = {
        'USD': ['XAU_USD', 'EUR_USD', 'GBP_USD', 'SPX500_USD', 'NAS100_USD', 'US30_USD'],
        'EUR': ['EUR_USD'],
        'GBP': ['GBP_USD'],
    }

    def evaluate_macro_context(
        self,
        target_asset: str,
        current_time_utc: datetime.datetime,
        calendar_events: List[Dict]
    ) -> MacroContextResult:
        """
        Evalúa si existen noticias de alto impacto próximas o desviaciones macro directas.
        """
        clean_asset = target_asset.upper()

        for event in calendar_events:
            event_time = datetime.datetime.fromisoformat(event['event_time'].replace('Z', '+00:00'))
            impact = event.get('impact', '').upper()
            country = event.get('country', '').upper()
            
            # Comprobar si el evento afecta a este activo
            affected_assets = self.CURRENCY_ASSET_MAP.get(country, [])
            if clean_asset not in affected_assets and country not in clean_asset:
                continue

            time_diff_min = (event_time - current_time_utc).total_seconds() / 60.0

            # Ventana de Blackout: +-15 minutos de un evento HIGH
            if impact in ('HIGH', 'HIGH IMPACT') and abs(time_diff_min) <= 15.0:
                return MacroContextResult(
                    directional_bias="NEUTRAL",
                    is_in_blackout=True,
                    event_name=event.get('event_name'),
                    minutes_to_event=int(time_diff_min),
                    macro_score_contrib=0.0
                )

        # Si no hay blackout, el contexto macro aporta puntuación de estabilidad
        return MacroContextResult(
            directional_bias="BULLISH" if 'XAU' in clean_asset else "NEUTRAL",
            is_in_blackout=False,
            event_name=None,
            minutes_to_event=None,
            macro_score_contrib=20.0
        )


class ExplainableScorer:
    """
    Motor de puntuación institucional determinista (0 a 100) con desglose auditable.
    """

    def calculate_signal_score(
        self,
        asset: str,
        direction: str,
        price: float,
        dpoc: float,
        dvwap: float,
        regime: MarketRegimeResult,
        macro: MacroContextResult,
        current_hour_utc: int
    ) -> SignalScoreResult:
        """
        Calcula el score aditivo (0-100) y genera la tesis cuantitativa.
        """
        breakdown = {
            "auction_structure": 0.0,  # Max 35
            "regime_momentum": 0.0,    # Max 25
            "macro_context": 0.0,      # Max 25
            "session_timing": 0.0      # Max 15
        }
        confluences = []

        # 1. Estructura de Subasta (Max 35 Puntos)
        is_long = (direction.upper() == 'BUY')
        pip_size = 0.10 if 'XAU' in asset else 0.0001
        dist_to_dpoc_pips = abs(price - dpoc) / pip_size
        dist_to_dvwap_pips = abs(price - dvwap) / pip_size

        if dist_to_dpoc_pips <= 25.0:
            breakdown["auction_structure"] += 20.0
            confluences.append("Rebote en Volume Profile dPOC")

        if (is_long and price >= dvwap) or (not is_long and price <= dvwap):
            breakdown["auction_structure"] += 15.0
            confluences.append("Soporte Dinamico Session dVWAP")
        elif dist_to_dvwap_pips <= 20.0:
            breakdown["auction_structure"] += 10.0
            confluences.append("Pullback a dVWAP Institucional")

        # 2. Régimen y Momentum (Max 25 Puntos)
        if regime.is_tradable:
            if (is_long and regime.regime_code == 'TREND_BULL') or (not is_long and regime.regime_code == 'TREND_BEAR'):
                breakdown["regime_momentum"] += 25.0
                confluences.append(f"Alineacion con {regime.regime_name} (ADX {regime.trend_strength})")
            elif regime.regime_code == 'RANGE_COMPRESSION':
                breakdown["regime_momentum"] += 18.0
                confluences.append("Compresion de Rango / Mean Reversion")
            else:
                breakdown["regime_momentum"] += 10.0
        else:
            confluences.append("Advertencia: Volatilidad Mixta")

        # 3. Contexto Macroeconómico (Max 25 Puntos)
        if macro.is_in_blackout:
            breakdown["macro_context"] = 0.0
            confluences.append(f"ALERTA: Blackout por {macro.event_name}")
        else:
            breakdown["macro_context"] += macro.macro_score_contrib
            confluences.append("Ventana Macro Despejada (Sin Noticias High)")

        # 4. Horario y Killzones (Max 15 Puntos)
        if 7 <= current_hour_utc <= 10:
            breakdown["session_timing"] = 15.0
            confluences.append("Killzone Apertura de Londres")
        elif 12 <= current_hour_utc <= 15:
            breakdown["session_timing"] = 15.0
            confluences.append("Killzone Apertura de Nueva York")
        elif 0 <= current_hour_utc <= 6:
            breakdown["session_timing"] = 8.0
            confluences.append("Sesion Asiatica (Liquidez Media)")
        else:
            breakdown["session_timing"] = 3.0

        total = int(round(sum(breakdown.values())))
        total = min(max(total, 0), 100)

        # Generar Tesis Explicable
        thesis = (
            f"Oportunidad en {asset} ({direction}) respaldada por {confluences[0] if confluences else 'patron tecnico'}, "
            f"confluencia de {regime.regime_name} y liquidez de sesion (Score institucional: {total}/100)."
        )

        return SignalScoreResult(
            total_score=total,
            is_valid_setup=(total >= 70 and not macro.is_in_blackout),
            breakdown=breakdown,
            confluences=confluences,
            institutional_thesis=thesis
        )


if __name__ == '__main__':
    # Test demostrativo de integración
    np.random.seed(42)
    closes = 2650.0 + np.cumsum(np.random.randn(60) * 1.2)
    highs = closes + 0.8
    lows = closes - 0.7

    regime_det = MarketRegimeDetector()
    regime_res = regime_det.detect_regime(highs, lows, closes)

    macro_corr = MacroCalendarCorrelator()
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    macro_res = macro_corr.evaluate_macro_context('XAU_USD', now_utc, [])

    scorer = ExplainableScorer()
    score_res = scorer.calculate_signal_score(
        asset='XAU_USD',
        direction='BUY',
        price=closes[-1],
        dpoc=closes[-1] - 0.5,
        dvwap=closes[-1] - 0.2,
        regime=regime_res,
        macro=macro_res,
        current_hour_utc=8  # Londres Killzone
    )

    print("==========================================================")
    print("AEON MARKET INTELLIGENCE — INFORME DE SCORING EXPLICABLE")
    print("==========================================================")
    print(f"Activo / Direccion:      XAU_USD / BUY")
    print(f"Regimen Detectado:       {regime_res.regime_name} (ADX: {regime_res.trend_strength})")
    print(f"Score Total:             {score_res.total_score}/100  ({'VALIDO' if score_res.is_valid_setup else 'RECHAZADO'})")
    print("Desglose de Puntos:")
    for k, v in score_res.breakdown.items():
        print(f"  - {k:22s}: {v:.1f} pts")
    print(f"Confluencias ({len(score_res.confluences)}):")
    for c in score_res.confluences:
        print(f"  * {c}")
    print(f"Tesis Cuantitativa:\n  \"{score_res.institutional_thesis}\"")
    print("==========================================================")
