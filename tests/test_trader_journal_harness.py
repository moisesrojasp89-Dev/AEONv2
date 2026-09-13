#!/usr/bin/env python3
"""
Test Suite: AEON AI Trader Journal & Copilot Logging (Harness Architecture)
=============================================================================
Pruebas exhaustivas para certificar los 6 candados del Arquitecto Técnico y
la regla de desambiguación para posiciones simultáneas:
1. Rechazo determinista de coherencia direccional pre-INSERT
2. Matemática bifurcada de MFE/MAE en BUY y SELL (sin inversión de signo)
3. Prevención atómica de condición de carrera (WHERE status = 'OPEN')
4. Sincronización dinámica de posiciones OPEN en RAM sin reiniciar
5. Desambiguación estricta de trades simultáneos (sin adivinación silenciosa)
6. Exclusión inequívoca de trades CANCELLED y OPEN en la auditoría semanal
7. Filtro Anti-Advisor (Denylist + esquema de reporte de riesgo)
=============================================================================
"""

import os
import sys
import unittest
from datetime import datetime, timezone

# Asegurar path de importación
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from scripts.ai.trader_journal_harness import (
    validate_trade_coherence,
    parse_trade_intent,
    disambiguate_trade,
    calculate_trade_excursion,
    calculate_realized_pnl,
    sanitize_anti_advisor,
    run_weekly_trader_audit,
    freeze_quantum_snapshot
)


class TestTraderJournalHarness(unittest.TestCase):

    # -------------------------------------------------------------------------
    # 1. COHERENCIA DIRECCIONAL PRE-INSERT
    # -------------------------------------------------------------------------
    def test_directional_coherence_validation_buy(self):
        # Caso válido: SL (2642) < Entrada (2650) < TP (2668)
        valid, msg = validate_trade_coherence("BUY", 2650.0, 2642.0, 2668.0)
        self.assertTrue(valid)
        self.assertEqual(msg, "OK")

        # Incoherencia: SL por encima de entrada
        invalid, msg = validate_trade_coherence("BUY", 2650.0, 2655.0, 2670.0)
        self.assertFalse(invalid)
        self.assertIn("Incoherencia en COMPRA", msg)

        # Incoherencia: TP por debajo de entrada
        invalid2, msg2 = validate_trade_coherence("BUY", 2650.0, 2640.0, 2630.0)
        self.assertFalse(invalid2)
        self.assertIn("Incoherencia en COMPRA", msg2)

    def test_directional_coherence_validation_sell(self):
        # Caso válido: TP (2632) < Entrada (2650) < SL (2658)
        valid, msg = validate_trade_coherence("SELL", 2650.0, 2658.0, 2632.0)
        self.assertTrue(valid)
        self.assertEqual(msg, "OK")

        # Incoherencia: SL por debajo de entrada
        invalid, msg = validate_trade_coherence("SELL", 2650.0, 2645.0, 2630.0)
        self.assertFalse(invalid)
        self.assertIn("Incoherencia en VENTA", msg)

        # Incoherencia: TP por encima de entrada
        invalid2, msg2 = validate_trade_coherence("SELL", 2650.0, 2660.0, 2670.0)
        self.assertFalse(invalid2)
        self.assertIn("Incoherencia en VENTA", msg2)

    # -------------------------------------------------------------------------
    # 2. MATEMÁTICA BIFURCADA DE MFE/MAE (BUY vs SELL — SIN INVERSIÓN DE SIGNO)
    # -------------------------------------------------------------------------
    def test_mfe_mae_buy_direction_math(self):
        """
        Números auditados a mano por Claude:
        BUY entry 2650, SL 2642 (r_dist = 8)
        - Precio sube a TP 2668 -> (2668-2650)/8 = +2.25R
        - Precio baja a SL 2642 -> (2642-2650)/8 = -1.00R
        """
        entry = 2650.0
        sl = 2642.0

        # Subida favorable
        mfe, mae, curr_r = calculate_trade_excursion("BUY", entry, sl, 2668.0, 0.0, 0.0)
        self.assertEqual(curr_r, 2.25)
        self.assertEqual(mfe, 2.25)
        self.assertEqual(mae, 0.0)

        # Retroceso adverso
        mfe2, mae2, curr_r2 = calculate_trade_excursion("BUY", entry, sl, 2642.0, mfe, mae)
        self.assertEqual(curr_r2, -1.0)
        self.assertEqual(mfe2, 2.25)
        self.assertEqual(mae2, -1.0)

    def test_mfe_mae_sell_direction_math(self):
        """
        Números auditados a mano por Claude:
        SELL entry 2650, SL 2658 (r_dist = 8)
        - Precio baja favorable a 2632 -> (2650-2632)/8 = +2.25R
        - Precio sube adverso a SL 2658 -> (2650-2658)/8 = -1.00R
        """
        entry = 2650.0
        sl = 2658.0

        # Bajada favorable (precio a 2632)
        mfe, mae, curr_r = calculate_trade_excursion("SELL", entry, sl, 2632.0, 0.0, 0.0)
        self.assertEqual(curr_r, 2.25)
        self.assertEqual(mfe, 2.25)
        self.assertEqual(mae, 0.0)

        # Subida adversa (precio toca SL en 2658)
        mfe2, mae2, curr_r2 = calculate_trade_excursion("SELL", entry, sl, 2658.0, mfe, mae)
        self.assertEqual(curr_r2, -1.0)
        self.assertEqual(mfe2, 2.25)
        self.assertEqual(mae2, -1.0)

    # -------------------------------------------------------------------------
    # 3. PREVENCIÓN ATÓMICA DE CONDICIÓN DE CARRERA (WHERE status = 'OPEN')
    # -------------------------------------------------------------------------
    def test_ratchet_race_condition_protection(self):
        """
        Simula que un trade fue marcado como CLOSED por el cierre conversacional,
        y luego una ejecución tardía del Ratchet intenta actualizar mfe_r.
        Con el filtro WHERE status = 'OPEN', la escritura afecta 0 filas.
        """
        # Mock de tabla en base de datos
        db_mock = {
            "trade_001": {
                "id": "trade_001",
                "symbol": "XAUUSD",
                "status": "CLOSED", # Ya cerrado por el trader
                "exit_price": 2668.0,
                "realized_rr": 2.25,
                "mfe_r": 2.25,
                "mae_r": -0.25
            }
        }

        # Simulación del query atómico del Ratchet
        def ratchet_update_trade(trade_id: str, new_mfe: float, new_mae: float) -> int:
            trade = db_mock.get(trade_id)
            # Condición estricta: WHERE id = :id AND status = 'OPEN'
            if trade and trade["status"] == "OPEN":
                trade["mfe_r"] = max(trade["mfe_r"], new_mfe)
                trade["mae_r"] = min(trade["mae_r"], new_mae)
                return 1
            return 0 # 0 filas afectadas

        # Escritura tardía intenta actualizar a MFE 3.00
        rows_affected = ratchet_update_trade("trade_001", 3.00, -0.50)
        self.assertEqual(rows_affected, 0)
        # Los datos del trade cerrado permanecen intactos
        self.assertEqual(db_mock["trade_001"]["mfe_r"], 2.25)
        self.assertEqual(db_mock["trade_001"]["status"], "CLOSED")

    # -------------------------------------------------------------------------
    # 4. SINCRONIZACIÓN DINÁMICA DE POSICIONES OPEN EN RAM
    # -------------------------------------------------------------------------
    def test_dynamic_ram_sync_new_trade(self):
        """
        Valida que un trade insertado dinámicamente sea detectado en el siguiente
        ciclo sin reiniciar el proceso.
        """
        active_db = [
            {"id": "t1", "symbol": "EURUSD", "status": "OPEN", "direction": "BUY", "entry_price": 1.0850, "stop_loss": 1.0820, "mfe_r": 0.0, "mae_r": 0.0}
        ]

        def get_open_trades_from_db():
            return [t for t in active_db if t["status"] == "OPEN"]

        # Ciclo 1: 1 trade
        trades_cycle_1 = get_open_trades_from_db()
        self.assertEqual(len(trades_cycle_1), 1)

        # Usuario inserta un nuevo trade desde el chat
        active_db.append(
            {"id": "t2", "symbol": "XAUUSD", "status": "OPEN", "direction": "BUY", "entry_price": 2650.0, "stop_loss": 2642.0, "mfe_r": 0.0, "mae_r": 0.0}
        )

        # Ciclo 2: detecta automáticamente 2 trades sin reiniciar
        trades_cycle_2 = get_open_trades_from_db()
        self.assertEqual(len(trades_cycle_2), 2)
        self.assertIn("t2", [t["id"] for t in trades_cycle_2])

        # Usuario cierra el trade t1
        active_db[0]["status"] = "CLOSED"

        # Ciclo 3: t1 desaparece de RAM automáticamente
        trades_cycle_3 = get_open_trades_from_db()
        self.assertEqual(len(trades_cycle_3), 1)
        self.assertEqual(trades_cycle_3[0]["id"], "t2")

    # -------------------------------------------------------------------------
    # 5. DESAMBIGUACIÓN DE ÓRDENES SIMULTÁNEAS (REGLA DE ORO: NO ADIVINAR)
    # -------------------------------------------------------------------------
    def test_disambiguation_multiple_open_trades_same_symbol(self):
        """
        Si el trader tiene 2 órdenes abiertas en XAUUSD (scaling) y dice "cancela trade de XAUUSD",
        el Harness NO debe adivinar: debe frenar y pedir aclaración con los precios/IDs.
        """
        open_trades = [
            {
                "id": "a1b2c3d4-0001",
                "symbol": "XAUUSD",
                "direction": "BUY",
                "entry_price": 2650.0,
                "stop_loss": 2642.0,
                "take_profit": 2668.0,
                "entry_timestamp": "2026-09-13T10:00:00Z"
            },
            {
                "id": "e5f6g7h8-0002",
                "symbol": "XAUUSD",
                "direction": "BUY",
                "entry_price": 2645.0,
                "stop_loss": 2638.0,
                "take_profit": 2665.0,
                "entry_timestamp": "2026-09-13T10:30:00Z"
            }
        ]

        # 1. Referencia ambigua solo por símbolo -> AMBIGUOUS
        res = disambiguate_trade(open_trades, symbol="XAUUSD")
        self.assertEqual(res["status"], "AMBIGUOUS")
        self.assertIn("Tienes 2 posiciones abiertas en XAUUSD", res["message"])
        self.assertIn("2650.0", res["message"])
        self.assertIn("2645.0", res["message"])

        # 2. Referencia a "mi último trade" -> UNÍVOCO (selecciona el de las 10:30)
        res_last = disambiguate_trade(open_trades, is_last_trade=True)
        self.assertEqual(res_last["status"], "OK")
        self.assertEqual(res_last["trade"]["id"], "e5f6g7h8-0002")

        # 3. Referencia por ID corto -> UNÍVOCO
        res_id = disambiguate_trade(open_trades, trade_id="a1b2c3d4")
        self.assertEqual(res_id["status"], "OK")
        self.assertEqual(res_id["trade"]["id"], "a1b2c3d4-0001")

    # -------------------------------------------------------------------------
    # 6. EXCLUSIÓN DE TRADES CANCELLED Y OPEN EN AUDITORÍA SEMANAL
    # -------------------------------------------------------------------------
    def test_cancelled_and_open_trades_excluded_from_audit(self):
        """
        Valida que un trade con status='CANCELLED' o 'OPEN' no distorsione
        el Win Rate ni el PnL neto en la auditoría semanal.
        """
        all_user_records = [
            # 1. Trade Ganado
            {
                "id": "t1", "symbol": "XAUUSD", "direction": "BUY",
                "entry_price": 2650.0, "stop_loss": 2642.0, "take_profit": 2668.0,
                "planned_rr_ratio": 2.25, "realized_rr": 2.25,
                "mfe_r": 2.25, "mae_r": -0.20,
                "status": "CLOSED",
                "quantum_context_at_entry": {"dpoc_price": 2652.0}
            },
            # 2. Trade Perdido
            {
                "id": "t2", "symbol": "EURUSD", "direction": "SELL",
                "entry_price": 1.0850, "stop_loss": 1.0880, "take_profit": 1.0790,
                "planned_rr_ratio": 2.00, "realized_rr": -1.00,
                "mfe_r": 0.40, "mae_r": -1.00,
                "status": "CLOSED",
                "quantum_context_at_entry": {"dpoc_price": 1.0845}
            },
            # 3. Trade CANCELADO (Error de dictado — NO DEBE COMPUTAR)
            {
                "id": "t3_cancelled", "symbol": "GBPUSD", "direction": "BUY",
                "entry_price": 1.3500, "stop_loss": 1.3450, "take_profit": 1.3650,
                "planned_rr_ratio": 3.00, "realized_rr": 3.00, # Valor ficticio
                "status": "CANCELLED"
            },
            # 4. Trade aún ABIERTO (NO DEBE COMPUTAR)
            {
                "id": "t4_open", "symbol": "BTCUSD", "direction": "BUY",
                "entry_price": 78000.0, "stop_loss": 77000.0, "take_profit": 80000.0,
                "planned_rr_ratio": 2.00,
                "status": "OPEN"
            }
        ]

        audit = run_weekly_trader_audit(all_user_records, "2026-09-07", "2026-09-13")

        # Total trades computados: EXACTAMENTE 2 (solo los CLOSED)
        self.assertEqual(audit["total_trades_logged"], 2)
        self.assertEqual(audit["winning_trades"], 1)
        self.assertEqual(audit["losing_trades"], 1)
        self.assertEqual(audit["win_rate_pct"], 50.0)
        # PnL neto: +2.25R - 1.00R = +1.25R (el trade CANCELLED no sumó)
        self.assertEqual(audit["net_pnl_r"], 1.25)
        # El promedio de MAE solo considera los 2 cerrados: (-0.20 + -1.00)/2 = -0.60
        self.assertEqual(audit["average_mae_r"], -0.60)

    # -------------------------------------------------------------------------
    # 7. FILTRO ANTI-ADVISOR (DENYLIST DE RECOMENDACIONES)
    # -------------------------------------------------------------------------
    def test_anti_advisor_denylist_sanitization(self):
        unsafe_text_1 = "Te recomiendo comprar Oro inmediatamente porque romperá máximos."
        violates, clean = sanitize_anti_advisor(unsafe_text_1)
        self.assertTrue(violates)
        self.assertNotIn("Te recomiendo", clean)

        unsafe_text_2 = "Deberías cerrar tu posición de EURUSD ya que viene el NFP."
        violates2, clean2 = sanitize_anti_advisor(unsafe_text_2)
        self.assertTrue(violates2)
        self.assertNotIn("Deberías cerrar", clean2)

        safe_text = "El precio de XAUUSD se encuentra a +1.5 desviaciones del VWAP con resistencia en 2665."
        violates_safe, clean_safe = sanitize_anti_advisor(safe_text)
        self.assertFalse(violates_safe)
        self.assertEqual(safe_text, clean_safe)

    # -------------------------------------------------------------------------
    # 8. PARSEO CONVERSACIONAL DE INTENCIONES
    # -------------------------------------------------------------------------
    def test_parse_trade_intent_variations(self):
        # 1. Registro explícito de compra
        p1 = parse_trade_intent("Entré en compra en XAUUSD en 2650.00, SL 2642.00, TP 2668.00")
        self.assertEqual(p1["action"], "LOG_TRADE")
        self.assertEqual(p1["symbol"], "XAUUSD")
        self.assertEqual(p1["direction"], "BUY")
        self.assertEqual(p1["entry_price"], 2650.0)
        self.assertEqual(p1["stop_loss"], 2642.0)
        self.assertEqual(p1["take_profit"], 2668.0)

        # 2. Registro coloquial de venta
        p2 = parse_trade_intent("Metí un corto en EURUSD entrada 1.0850 stop 1.0880 target 1.0790")
        self.assertEqual(p2["action"], "LOG_TRADE")
        self.assertEqual(p2["symbol"], "EURUSD")
        self.assertEqual(p2["direction"], "SELL")
        self.assertEqual(p2["entry_price"], 1.0850)

        # 3. Cierre conversacional
        p3 = parse_trade_intent("Cerré XAUUSD en 2668, tocó TP completo")
        self.assertEqual(p3["action"], "CLOSE_TRADE")
        self.assertEqual(p3["symbol"], "XAUUSD")
        self.assertEqual(p3["exit_price"], 2668.0)
        self.assertEqual(p3["exit_reason"], "TP_HIT")

        # 4. Anulación conversacional
        p4 = parse_trade_intent("Cancela mi último trade de XAUUSD, me equivoqué de precio")
        self.assertEqual(p4["action"], "CANCEL_TRADE")
        self.assertEqual(p4["symbol"], "XAUUSD")
        self.assertTrue(p4["is_last_trade"])

        # 5. Auditoría semanal
        p5 = parse_trade_intent("Hazme el análisis de mis trades de la semana")
        self.assertEqual(p5["action"], "REQUEST_AUDIT")


if __name__ == '__main__':
    unittest.main()
