"""
==============================================================================
AEON Quantitative Lab — Walk-Forward Validator & Monte Carlo Stress Tester
==============================================================================
Gobernanza: docs/AEON_QUANT_AUDIT.md (QUANT-06) & docs/AEON_ROADMAP_V2.md (Fase 2)
Objetivo: Ejecutar optimización fuera de muestra (OOS), Walk-Forward Efficiency (WFE)
          y simulación de Monte Carlo (1.000 iteraciones) para certificar robustez.
==============================================================================
"""

import numpy as np
from typing import List, Dict, Tuple


class WalkForwardOptimizer:
    """
    Ejecutor de Walk-Forward Analysis con ventanas móviles para prevenir sobreajuste (overfitting).
    """

    def __init__(self, n_splits: int = 5, in_sample_pct: float = 0.70):
        self.n_splits = n_splits
        self.is_pct = in_sample_pct

    def split_data(self, data_series: np.ndarray) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Divide la serie temporal en N ventanas móviles (In-Sample vs Out-of-Sample).
        """
        n_total = len(data_series)
        window_size = n_total // self.n_splits
        splits = []

        for i in range(self.n_splits):
            start_idx = i * (window_size // 2)
            end_idx = min(start_idx + window_size, n_total)
            window_data = data_series[start_idx:end_idx]
            
            split_point = int(len(window_data) * self.is_pct)
            in_sample = window_data[:split_point]
            out_of_sample = window_data[split_point:]

            if len(in_sample) > 0 and len(out_of_sample) > 0:
                splits.append((in_sample, out_of_sample))

        return splits

    def calculate_wfe(self, is_returns: List[float], oos_returns: List[float]) -> float:
        """
        Calcula la Walk-Forward Efficiency (WFE = Retorno Medio OOS / Retorno Medio IS).
        """
        mean_is = np.mean(is_returns) if len(is_returns) > 0 else 0.0
        mean_oos = np.mean(oos_returns) if len(oos_returns) > 0 else 0.0

        if mean_is <= 0:
            return 0.0
        return float(round((mean_oos / mean_is) * 100, 2))


class MonteCarloStressTester:
    """
    Simulador de Monte Carlo con permutación aleatoria de secuencias de trades
    y choque estocástico de volatilidad y slippage.
    """

    def __init__(self, n_simulations: int = 1000, initial_capital: float = 10000.0):
        self.n_sims = n_simulations
        self.capital = initial_capital

    def run_simulation(self, trade_pnls: List[float], slippage_stress_pct: float = 0.15) -> Dict[str, float]:
        """
        Ejecuta 1.000 simulaciones permutando el orden de los trades y aplicando estrés.
        """
        pnl_arr = np.array(trade_pnls)
        n_trades = len(pnl_arr)

        if n_trades == 0:
            return {'error': 'No trades to simulate'}

        sim_final_capitals = []
        sim_max_drawdowns = []
        sim_max_drawdown_pcts = []

        for seed in range(self.n_sims):
            np.random.seed(seed)
            # Permutación aleatoria del orden de ejecución
            permuted_pnls = np.random.permutation(pnl_arr)
            
            # Aplicar choque aleatorio de slippage en operaciones perdedoras
            stress_factors = np.random.uniform(1.0, 1.0 + slippage_stress_pct, size=n_trades)
            stressed_pnls = np.where(permuted_pnls < 0, permuted_pnls * stress_factors, permuted_pnls)

            equity_curve = self.capital + np.cumsum(stressed_pnls)
            sim_final_capitals.append(equity_curve[-1])

            # Calcular Max Drawdown de esta iteración
            peak = np.maximum.accumulate(equity_curve)
            dd_usd = peak - equity_curve
            dd_pct = (dd_usd / peak) * 100.0

            sim_max_drawdowns.append(np.max(dd_usd))
            sim_max_drawdown_pcts.append(np.max(dd_pct))

        sim_final_capitals = np.array(sim_final_capitals)
        sim_max_drawdown_pcts = np.array(sim_max_drawdown_pcts)

        prob_dd_above_12 = float(np.mean(sim_max_drawdown_pcts > 12.0) * 100.0)
        prob_dd_above_15 = float(np.mean(sim_max_drawdown_pcts > 15.0) * 100.0)

        return {
            'simulations_run': self.n_sims,
            'initial_capital': self.capital,
            'p5_final_capital': round(float(np.percentile(sim_final_capitals, 5)), 2),
            'median_final_capital': round(float(np.median(sim_final_capitals)), 2),
            'p95_final_capital': round(float(np.percentile(sim_final_capitals, 95)), 2),
            'median_max_dd_pct': round(float(np.median(sim_max_drawdown_pcts)), 2),
            'p95_worst_dd_pct': round(float(np.percentile(sim_max_drawdown_pcts, 95)), 2),
            'prob_dd_exceeds_12pct': round(prob_dd_above_12, 2),
            'prob_dd_exceeds_15pct': round(prob_dd_above_15, 2),
            'passed_certification': (prob_dd_above_15 < 1.0) and (float(np.median(sim_final_capitals)) > self.capital)
        }


if __name__ == '__main__':
    # Test demostrativo con 300 trades con PnL neto realista
    np.random.seed(2026)
    simulated_net_pnls = []
    
    for _ in range(300):
        if np.random.rand() > 0.48:  # 52% Win Rate
            simulated_net_pnls.append(float(np.random.uniform(120.0, 280.0)))  # +1.5R a +2.5R
        else:
            simulated_net_pnls.append(float(np.random.uniform(-105.0, -115.0))) # -1.0R + fricción

    mc = MonteCarloStressTester(n_simulations=1000, initial_capital=10000.0)
    res = mc.run_simulation(simulated_net_pnls)

    print("==========================================================")
    print("AEON QUANT LAB — CERTIFICACIÓN MONTE CARLO (1.000 RUNS)")
    print("==========================================================")
    print(f"Capital Inicial:           ${res['initial_capital']:,.2f}")
    print(f"Capital Final (Mediana):   ${res['median_final_capital']:,.2f}")
    print(f"Capital Final (P5 Pesimista): ${res['p5_final_capital']:,.2f}")
    print(f"Capital Final (P95 Optimista): ${res['p95_final_capital']:,.2f}")
    print(f"Max Drawdown (Mediana):    {res['median_max_dd_pct']}%")
    print(f"Max Drawdown (P95 Peor Caso): {res['p95_worst_dd_pct']}%")
    print(f"Probabilidad DD > 12%:     {res['prob_dd_exceeds_12pct']}%")
    print(f"Probabilidad DD > 15%:     {res['prob_dd_exceeds_15pct']}%")
    print(f"Certificacion Institucional: {'[APROBADO - PASS]' if res['passed_certification'] else '[RECHAZADO - FAIL]'}")
    print("==========================================================")
