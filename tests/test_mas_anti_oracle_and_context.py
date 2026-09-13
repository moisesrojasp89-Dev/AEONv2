"""
tests/test_mas_anti_oracle_and_context.py
==============================================================================
Suite de Pruebas de Regresión: Guardrails Anti-Oráculo, Desacoplamiento
y Formato de Auditoría Cuantitativa (Fase MAS v1.1.0)
==============================================================================
Valida las recomendaciones arquitectónicas auditadas por Claude:
1. Filtro Denylist determinista contra verbos imperativos/oraculares.
2. Invarianza de oraciones institucionales descriptivas y neutrales.
3. Cálculo matemático de invalidación estructural con buffers de spread.
4. Lógica de cálculo de Ratio R:R determinista y manejo de caso borde invalidado.
5. Desacoplamiento del Gate Estructural (disparo por microestructura sin censura de DXY).
"""

import re
import unittest

# Regex Denylist idéntico al implementado en Supabase Edge Function (aeon-copilot-event)
ORACLE_DENYLIST_REGEX = re.compile(
    r'\b(compra|compre|compren|comprar|comprando|compramos|vende|venda|venden|vender|vendiendo|vendemos|aprovecha|aprovechen|aprovechar|entra|entren|entrar|entrando|dispara|disparen|disparar|ejecuta|ejecuten|ejecutar|metele|haz long|haz short|tomar posicion|toma posicion)\b',
    re.IGNORECASE
)

def calculate_structural_invalidation(poi_range, setup_type, current_price, asset):
    is_gold = 'XAU' in asset
    is_jpy = 'JPY' in asset
    spread_buffer = 0.50 if is_gold else (0.03 if is_jpy else 0.00030)

    if setup_type == 'ZAP_SUPPLY_SWEEP':
        high = poi_range[1] if poi_range and len(poi_range) > 1 else current_price
        return round(high + spread_buffer, 2 if is_gold else 5)
    else:
        low = poi_range[0] if poi_range and len(poi_range) > 0 else current_price
        return round(low - spread_buffer, 2 if is_gold else 5)

def evaluate_scenario_risk_reward(entry_price, sl_price, tp_price, is_buy):
    """Calcula el R:R determinista y maneja el caso borde de estructura ya invalidada."""
    if is_buy:
        if entry_price <= sl_price:
            return {'status': 'invalidated', 'label': 'Estructura ya invalidada en ese precio', 'rr': 0.0}
        risk_dist = abs(entry_price - sl_price)
        reward_dist = abs(tp_price - entry_price)
    else:
        if entry_price >= sl_price:
            return {'status': 'invalidated', 'label': 'Estructura ya invalidada en ese precio', 'rr': 0.0}
        risk_dist = abs(sl_price - entry_price)
        reward_dist = abs(entry_price - tp_price)

    if risk_dist <= 0:
        return {'status': 'invalidated', 'label': 'Distancia de invalidación nula', 'rr': 0.0}

    rr = round(reward_dist / risk_dist, 2)
    if rr < 1.0:
        label = 'R:R subóptimo (<1:1)'
    elif rr <= 2.0:
        label = 'R:R aceptable (1:1–2:1)'
    else:
        label = 'R:R favorable (>2:1)'

    return {'status': 'valid', 'label': label, 'rr': rr}

class TestAntiOracleAndContextRegression(unittest.TestCase):

    def test_denylist_catches_adversarial_oracle_prompts(self):
        """Comprueba que cualquier intento del LLM de recomendar trades sea bloqueado."""
        adversarial_outputs = [
            'Compra en 4300 con objetivo en ZAP.',
            'Se recomienda que compre ahora para maximizar ganancias.',
            'Vende antes del cierre de sesión.',
            'Aprovecha el rebote que se está dando en el dPOC.',
            'Entra inmediatamente en el mercado con stop corto.',
            'Dispara la orden en cuanto toque el soporte.',
            'Ejecuta una orden de compra en este nivel.',
            'Metele con todo el capital disponible.',
            'Haz long con ratio favorable.',
            'Haz short tras el barrido.'
        ]
        for output in adversarial_outputs:
            with self.subTest(output=output):
                self.assertTrue(
                    bool(ORACLE_DENYLIST_REGEX.search(output)),
                    f'Fallo de denylist: No detectó sesgo de oráculo en: "{output}"'
                )

    def test_denylist_permits_objective_structural_descriptions(self):
        """Comprueba que las descripciones objetivas y cuantitativas pasen sin falso positivo."""
        compliant_outputs = [
            'XAUUSD ($4349.42) barrió mínimos asiáticos reaccionando con absorción sobre el soporte ZAP.',
            'Cotiza bajo el dPOC ($4356.38); invalidación técnica óptima en $4323.00.',
            'Rechazo institucional en ZAP de Oferta tras absorción de liquidez compradora (BSL).',
            'Absorción institucional en ZAP de Demanda tras barrido de liquidez vendedora (SSL).',
            'Estructura en rango de consolidación sin barrido institucional confirmado.',
            'DXY comprimiendo bajo resistencia mientras US10Y cae 1.2 pb; catalizador NFP ya asimilado.'
        ]
        for output in compliant_outputs:
            with self.subTest(output=output):
                self.assertFalse(
                    bool(ORACLE_DENYLIST_REGEX.search(output)),
                    f'Falso positivo de denylist: Bloqueó descripción legítima: "{output}"'
                )

    def test_structural_invalidation_spread_buffers(self):
        """Valida los buffers de spread institucional: 50¢ en oro, 3 pips en JPY, 0.00030 en FX."""
        # Oro: ZAP High = 2450.00 -> Invalidación = 2450.50
        inval_gold_sell = calculate_structural_invalidation([2440.0, 2450.0], 'ZAP_SUPPLY_SWEEP', 2445.0, 'XAUUSD')
        self.assertEqual(inval_gold_sell, 2450.50)

        # Oro: ZAP Low = 2400.00 -> Invalidación = 2399.50
        inval_gold_buy = calculate_structural_invalidation([2400.0, 2410.0], 'ZAP_DEMAND_SWEEP', 2405.0, 'XAUUSD')
        self.assertEqual(inval_gold_buy, 2399.50)

        # JPY: ZAP High = 155.20 -> Invalidación = 155.23
        inval_jpy = calculate_structural_invalidation([154.50, 155.20], 'ZAP_SUPPLY_SWEEP', 155.0, 'USDJPY')
        self.assertEqual(inval_jpy, 155.23)

        # FX: ZAP Low = 1.08500 -> Invalidación = 1.08470
        inval_fx = calculate_structural_invalidation([1.08500, 1.08900], 'ZAP_DEMAND_SWEEP', 1.08600, 'EURUSD')
        self.assertEqual(inval_fx, 1.08470)

    def test_risk_reward_calculation_and_edge_cases(self):
        """Verifica el cálculo crudo de R:R y la detección del caso borde invalidado."""
        # Caso de la captura del usuario: Entrada 4349.42, SL 4405.00 (55.58 pts), TP 4323.32 (26.10 pts) -> R:R 0.47:1
        res_user_case = evaluate_scenario_risk_reward(4349.42, 4405.00, 4323.32, is_buy=False)
        self.assertEqual(res_user_case['status'], 'valid')
        self.assertEqual(res_user_case['rr'], 0.47)
        self.assertIn('<1:1', res_user_case['label'])

        # Trade favorable: R:R 2.5:1
        res_favorable = evaluate_scenario_risk_reward(100.0, 90.0, 125.0, is_buy=True)
        self.assertEqual(res_favorable['status'], 'valid')
        self.assertEqual(res_favorable['rr'], 2.5)
        self.assertIn('>2:1', res_favorable['label'])

        # Caso Borde de Claude: Precio de compra propuesto YA cruzó el SL estructural
        res_edge_invalidated = evaluate_scenario_risk_reward(85.0, 90.0, 120.0, is_buy=True)
        self.assertEqual(res_edge_invalidated['status'], 'invalidated')
        self.assertEqual(res_edge_invalidated['label'], 'Estructura ya invalidada en ese precio')

    def test_decoupled_structural_event_gate(self):
        """Verifica que un barrido + ZAP gatilla alerta estructural sin depender de DXY."""
        def evaluate_gate(price, zap_range, bsl_swept, ssl_swept, dpoc, is_sell):
            micro_score = 0
            if zap_range[0] <= price <= zap_range[1]:
                micro_score += 15
            if is_sell and bsl_swept:
                micro_score += 15
            elif (not is_sell) and ssl_swept:
                micro_score += 15
            if abs(price - dpoc) > 0:
                micro_score += 10
            return micro_score >= 25

        # Barrido SSL + En ZAP Demanda + Desequilibrio dPOC = 40 pts -> GATE PASA
        gate_ok = evaluate_gate(4349.42, [4323.0, 4355.0], False, True, 4356.38, False)
        self.assertTrue(gate_ok, 'El barrido en ZAP debe gatillar la alerta estructural independientemente del DXY.')

        # Sin barrido y fuera de ZAP = 10 pts (solo dist dPOC) -> GATE BLOQUEADO (ruido menor)
        gate_blocked = evaluate_gate(4500.0, [4323.0, 4355.0], False, False, 4356.38, False)
        self.assertFalse(gate_blocked, 'Fluctuación menor sin barrido ni ZAP no debe generar alerta.')

if __name__ == '__main__':
    unittest.main()
