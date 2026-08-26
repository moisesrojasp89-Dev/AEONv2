"""
==============================================================================
AEON Quantitative Lab — Real Market Friction & Execution Cost Simulator
==============================================================================
Gobernanza: docs/AEON_QUANT_AUDIT.md (QUANT-01) & docs/AEON_ROADMAP_V2.md
Objetivo: Modelar comisiones reales de broker (Exness Raw/Zero), spreads dinámicos,
          slippage estocástico en Stop Loss y swaps overnight para certificar
          la expectativa matemática real antes de producción.
==============================================================================
"""

import numpy as np
import dataclasses
from typing import List, Dict, Optional


@dataclasses.dataclass
class TradeOrder:
    asset: str
    direction: str  # 'BUY' | 'SELL'
    entry_price: float
    exit_price: float
    lot_size: float
    holding_hours: float
    is_stop_loss: bool
    is_break_even: bool
    hour_utc: int  # Hora de entrada (0 a 23)


@dataclasses.dataclass
class FrictionConfig:
    commission_per_lot_rt: float = 7.00  # $7.00 ida y vuelta (Exness Raw Spread)
    base_spread_pips: float = 1.2        # Spread base normal en pips
    rollover_spread_mult: float = 4.5    # Multiplicador de spread en rollover (21:45-23:15 UTC)
    mean_slippage_pips: float = 0.8      # Slippage medio en órdenes Stop Loss
    swap_per_day_usd: float = -1.50      # Coste de financiamiento diario por lote
    pip_value_std_lot: float = 10.00     # Valor de 1 pip para 1 lote estándar en USD


class MarketFrictionSimulator:
    """
    Simulador determinista y estocástico de fricciones reales de mercado.
    """

    def __init__(self, config: Optional[FrictionConfig] = None):
        self.cfg = config or FrictionConfig()

    def get_dynamic_spread(self, hour_utc: int) -> float:
        """Calcula el spread dinámico según la ventana horaria."""
        if hour_utc in (21, 22):
            return self.cfg.base_spread_pips * self.cfg.rollover_spread_mult
        return self.cfg.base_spread_pips

    def simulate_trade_friction(self, trade: TradeOrder, random_seed: Optional[int] = None) -> Dict[str, float]:
        """
        Calcula el PnL bruto, todas las deducciones de fricción y el PnL neto final.
        """
        if random_seed is not None:
            np.random.seed(random_seed)

        # 1. PnL Bruto Teórico
        direction_mult = 1.0 if trade.direction.upper() == 'BUY' else -1.0
        price_diff = (trade.exit_price - trade.entry_price) * direction_mult
        
        # Asumiendo pip = 0.0001 (o 0.01 para Oro)
        pip_size = 0.10 if 'XAU' in trade.asset.upper() else 0.0001
        pips_gained = price_diff / pip_size
        gross_pnl = pips_gained * self.cfg.pip_value_std_lot * trade.lot_size

        # 2. Coste de Comisión Directa del Broker
        commission_cost = self.cfg.commission_per_lot_rt * trade.lot_size

        # 3. Coste de Spread Dinámico
        spread_pips = self.get_dynamic_spread(trade.hour_utc)
        spread_cost = spread_pips * self.cfg.pip_value_std_lot * trade.lot_size

        # 4. Slippage Estocástico (Afecta órdenes SL y BE ejecutadas con volatilidad)
        slippage_cost = 0.0
        if trade.is_stop_loss or trade.is_break_even:
            # Distribución gamma para slippage positivo (desfavorable para el trader)
            actual_slippage_pips = np.random.gamma(shape=2.0, scale=self.cfg.mean_slippage_pips / 2.0)
            slippage_cost = actual_slippage_pips * self.cfg.pip_value_std_lot * trade.lot_size

        # 5. Coste de Swap / Financiamiento Nocturno
        days_held = trade.holding_hours / 24.0
        swap_cost = abs(self.cfg.swap_per_day_usd * trade.lot_size * days_held) if days_held >= 1.0 else 0.0

        # 6. PnL Neto
        total_friction = commission_cost + spread_cost + slippage_cost + swap_cost
        net_pnl = gross_pnl - total_friction

        return {
            'gross_pnl': round(gross_pnl, 2),
            'commission': round(commission_cost, 2),
            'spread': round(spread_cost, 2),
            'slippage': round(slippage_cost, 2),
            'swap': round(swap_cost, 2),
            'total_friction': round(total_friction, 2),
            'net_pnl': round(net_pnl, 2),
            'friction_impact_pct': round((total_friction / abs(gross_pnl) * 100) if gross_pnl != 0 else 100.0, 2)
        }

    def evaluate_portfolio(self, trades: List[TradeOrder]) -> Dict[str, float]:
        """
        Evalúa un conjunto completo de operaciones deduciendo todas las fricciones.
        """
        gross_pnls = []
        net_pnls = []
        total_commissions = 0.0
        total_spreads = 0.0
        total_slippages = 0.0
        total_swaps = 0.0

        for i, t in enumerate(trades):
            res = self.simulate_trade_friction(t, random_seed=42 + i)
            gross_pnls.append(res['gross_pnl'])
            net_pnls.append(res['net_pnl'])
            total_commissions += res['commission']
            total_spreads += res['spread']
            total_slippages += res['slippage']
            total_swaps += res['swap']

        gross_gains = sum(p for p in gross_pnls if p > 0)
        gross_losses = abs(sum(p for p in gross_pnls if p < 0))
        net_gains = sum(p for p in net_pnls if p > 0)
        net_losses = abs(sum(p for p in net_pnls if p < 0))

        gross_pf = round(gross_gains / gross_losses, 2) if gross_losses > 0 else 99.0
        net_pf = round(net_gains / net_losses, 2) if net_losses > 0 else 0.0

        # Drawdown en PnL Neto Acumulado
        cum_net = np.cumsum(net_pnls)
        peak = np.maximum.accumulate(cum_net)
        drawdowns = (peak - cum_net)
        max_dd = round(float(np.max(drawdowns)) if len(drawdowns) > 0 else 0.0, 2)

        return {
            'total_trades': len(trades),
            'gross_total_pnl': round(sum(gross_pnls), 2),
            'net_total_pnl': round(sum(net_pnls), 2),
            'gross_profit_factor': gross_pf,
            'net_profit_factor': net_pf,
            'total_commissions': round(total_commissions, 2),
            'total_spreads': round(total_spreads, 2),
            'total_slippages': round(total_slippages, 2),
            'total_swaps': round(total_swaps, 2),
            'total_friction_cost': round(total_commissions + total_spreads + total_slippages + total_swaps, 2),
            'max_drawdown_usd': max_dd
        }


if __name__ == '__main__':
    # Test de demostración con 200 trades sintéticos
    np.random.seed(101)
    sim = MarketFrictionSimulator()
    sample_trades = []

    for _ in range(200):
        is_win = np.random.rand() > 0.55
        is_sl = not is_win and np.random.rand() > 0.30
        is_be = not is_win and not is_sl

        entry = 2650.0
        exit_p = entry + (2.5 * 5.0) if is_win else (entry - 5.0 if is_sl else entry)
        
        sample_trades.append(TradeOrder(
            asset='XAU_USD',
            direction='BUY',
            entry_price=entry,
            exit_price=exit_p,
            lot_size=0.5,
            holding_hours=float(np.random.randint(1, 8)),
            is_stop_loss=is_sl,
            is_break_even=is_be,
            hour_utc=int(np.random.choice([8, 9, 13, 14, 15, 21, 22]))
        ))

    report = sim.evaluate_portfolio(sample_trades)
    print("==========================================================")
    print("AEON QUANT LAB — INFORME DE IMPACTO DE FRICCIONES REALES")
    print("==========================================================")
    print(f"Total Trades Evaluados:    {report['total_trades']}")
    print(f"PnL Bruto Teórico:         ${report['gross_total_pnl']:,.2f}  (PF Bruto: {report['gross_profit_factor']})")
    print(f"PnL Neto Real Tras Costes: ${report['net_total_pnl']:,.2f}  (PF Neto:  {report['net_profit_factor']})")
    print(f"Coste Total Fricciones:    -${report['total_friction_cost']:,.2f}")
    print(f"  - Comisiones Broker:     -${report['total_commissions']:,.2f}")
    print(f"  - Spreads Dinámicos:     -${report['total_spreads']:,.2f}")
    print(f"  - Slippage Estocástico:  -${report['total_slippages']:,.2f}")
    print(f"Max Drawdown Neto:         ${report['max_drawdown_usd']:,.2f}")
    print("==========================================================")
