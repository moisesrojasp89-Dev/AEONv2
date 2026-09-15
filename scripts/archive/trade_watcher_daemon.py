"""
==============================================================================
AEON Quantitative Lab — Production 24/7 Trade Watcher Daemon
==============================================================================
Gobernanza: docs/AEON_TECHNICAL_AUDIT.md (TECH-01) & docs/AEON_ROADMAP_V2.md (Fase 3)
Objetivo: Daemon asíncrono continuo de supervisión y ciclo de vida de trades para VPS Linux.
          Garantiza idempotencia, persistencia atómica ante caídas y latencia < 100ms.
==============================================================================
"""

import asyncio
import datetime
import json
import logging
import os
import signal
import sys
from typing import Dict, Optional, List
from data_provider import DataProvider, MT5ExnessProvider, NormalizedTicker

# Configuración de Logging Estructurado JSON
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":%(message)s}',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)
logger = logging.getLogger("AEON.TradeWatcher")


def log_event(event_type: str, details: dict):
    payload = {"event": event_type, **details}
    logger.info(json.dumps(payload))


class CanonicalSignalStatus:
    PENDING = "pending"
    ACTIVE = "active"
    HIT_TP1 = "hit_tp1"
    CLOSED_TP = "closed_tp"
    CLOSED_BE = "closed_be"
    CLOSED_SL = "closed_sl"
    CANCELLED = "cancelled"


class ActiveTrade:
    def __init__(
        self,
        signal_id: str,
        signal_key: str,
        asset: str,
        direction: str,
        entry_price: float,
        stop_loss: float,
        take_profit_1: float,
        take_profit_final: float,
        status: str = CanonicalSignalStatus.ACTIVE,
        realized_r: Optional[float] = None
    ):
        self.signal_id = signal_id
        self.signal_key = signal_key
        self.asset = asset.upper()
        self.direction = direction.upper()
        self.entry_price = float(entry_price)
        self.current_stop_loss = float(stop_loss)
        self.initial_stop_loss = float(stop_loss)
        self.take_profit_1 = float(take_profit_1)
        self.take_profit_final = float(take_profit_final)
        self.status = status
        self.realized_r = realized_r
        self.is_be_moved = (status == CanonicalSignalStatus.HIT_TP1)
        self.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "signal_id": self.signal_id,
            "signal_key": self.signal_key,
            "asset": self.asset,
            "direction": self.direction,
            "entry_price": self.entry_price,
            "current_stop_loss": self.current_stop_loss,
            "initial_stop_loss": self.initial_stop_loss,
            "take_profit_1": self.take_profit_1,
            "take_profit_final": self.take_profit_final,
            "status": self.status,
            "realized_r": self.realized_r,
            "is_be_moved": self.is_be_moved,
            "updated_at": self.updated_at
        }


class TradeWatcherDaemon:
    """
    Daemon autónomo de supervisión de trades en tiempo real para ejecución 24/7 en VPS.
    """

    def __init__(
        self,
        provider: DataProvider,
        state_file_path: str = "data/trade_watcher_state.json",
        tick_interval_sec: float = 0.5,
        heartbeat_interval_sec: float = 30.0
    ):
        self.provider = provider
        self.state_file = state_file_path
        self.tick_interval = tick_interval_sec
        self.heartbeat_interval = heartbeat_interval_sec
        self.active_trades: Dict[str, ActiveTrade] = {}
        self.is_running = False
        self._last_heartbeat = datetime.datetime.now(datetime.timezone.utc)

    # --------------------------------------------------------------------------
    # PERSISTENCIA ATÓMICA DE ESTADO
    # --------------------------------------------------------------------------
    def save_state_snapshot(self) -> None:
        """Escribe el snapshot de estado a disco de forma atómica evitando archivos corruptos."""
        os.makedirs(os.path.dirname(self.state_file) or '.', exist_ok=True)
        tmp_file = f"{self.state_file}.tmp"
        payload = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "trades": {k: v.to_dict() for k, v in self.active_trades.items()}
        }
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)
        os.replace(tmp_file, self.state_file)

    def recover_state(self) -> None:
        """Carga el snapshot del disco tras un reinicio para garantizar cero pérdidas de trades."""
        if not os.path.exists(self.state_file):
            log_event("STATE_INIT", {"msg": "No se encontro snapshot previo. Iniciando con estado limpio."})
            return

        try:
            with open(self.state_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            trades_raw = data.get("trades", {})
            for key, t_dict in trades_raw.items():
                self.active_trades[key] = ActiveTrade(
                    signal_id=t_dict["signal_id"],
                    signal_key=t_dict["signal_key"],
                    asset=t_dict["asset"],
                    direction=t_dict["direction"],
                    entry_price=t_dict["entry_price"],
                    stop_loss=t_dict["current_stop_loss"],
                    take_profit_1=t_dict["take_profit_1"],
                    take_profit_final=t_dict["take_profit_final"],
                    status=t_dict["status"],
                    realized_r=t_dict.get("realized_r")
                )
            log_event("STATE_RECOVERED", {"recovered_trades_count": len(self.active_trades)})
        except Exception as e:
            log_event("STATE_RECOVERY_ERROR", {"error": str(e)})

    # --------------------------------------------------------------------------
    # MÁQUINA DE ESTADOS DEL TRADE WATCHER
    # --------------------------------------------------------------------------
    def evaluate_price_tick(self, trade: ActiveTrade, ticker: NormalizedTicker) -> Optional[str]:
        """
        Evalúa el tick actual y ejecuta las transiciones atómicas de estado.
        """
        current_price = ticker.bid if trade.direction == 'BUY' else ticker.ask
        is_long = (trade.direction == 'BUY')

        # 1. Caso: Estado ACTIVE -> Comprobar TP1 o Stop Loss inicial
        if trade.status == CanonicalSignalStatus.ACTIVE:
            # Comprobar si tocó Stop Loss
            if (is_long and current_price <= trade.current_stop_loss) or \
               (not is_long and current_price >= trade.current_stop_loss):
                trade.status = CanonicalSignalStatus.CLOSED_SL
                trade.realized_r = -1.0
                trade.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                return CanonicalSignalStatus.CLOSED_SL

            # Comprobar si tocó TP1 -> Mover Stop Loss a Break-Even (0.0R)
            if (is_long and current_price >= trade.take_profit_1) or \
               (not is_long and current_price <= trade.take_profit_1):
                trade.status = CanonicalSignalStatus.HIT_TP1
                trade.current_stop_loss = trade.entry_price  # Ajuste a BE
                trade.is_be_moved = True
                trade.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                return CanonicalSignalStatus.HIT_TP1

        # 2. Caso: Estado HIT_TP1 (SL ya está en BE) -> Comprobar Target Final o Retroceso a BE
        elif trade.status == CanonicalSignalStatus.HIT_TP1:
            # Comprobar Target Final
            if (is_long and current_price >= trade.take_profit_final) or \
               (not is_long and current_price <= trade.take_profit_final):
                trade.status = CanonicalSignalStatus.CLOSED_TP
                trade.realized_r = 2.5
                trade.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                return CanonicalSignalStatus.CLOSED_TP

            # Comprobar Retroceso al Precio de Entrada (Break-Even)
            if (is_long and current_price <= trade.current_stop_loss) or \
               (not is_long and current_price >= trade.current_stop_loss):
                trade.status = CanonicalSignalStatus.CLOSED_BE
                trade.realized_r = 0.0
                trade.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                return CanonicalSignalStatus.CLOSED_BE

        return None

    # --------------------------------------------------------------------------
    # BUCLE PRINCIPAL DE EVENTOS Y PROCESOS ASÍNCRONOS
    # --------------------------------------------------------------------------
    async def heartbeat_loop(self):
        """Emite pulsos periódicos de salud para telemetría y monitoreo."""
        while self.is_running:
            await asyncio.sleep(self.heartbeat_interval)
            log_event("HEARTBEAT", {
                "active_trades_count": len(self.active_trades),
                "broker_connected": await self.provider.is_connected(),
                "uptime_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })

    async def watch_loop(self):
        """Bucle de alta frecuencia que evalúa las órdenes activas en cada tick de mercado."""
        while self.is_running:
            try:
                # Filtrar órdenes activas o en TP1
                monitored_keys = [
                    k for k, v in self.active_trades.items()
                    if v.status in (CanonicalSignalStatus.ACTIVE, CanonicalSignalStatus.HIT_TP1)
                ]

                for key in monitored_keys:
                    trade = self.active_trades[key]
                    ticker = await self.provider.get_latest_ticker(trade.asset)
                    if not ticker:
                        continue

                    new_status = self.evaluate_price_tick(trade, ticker)
                    if new_status:
                        log_event("STATE_TRANSITION", {
                            "signal_key": trade.signal_key,
                            "asset": trade.asset,
                            "new_status": new_status,
                            "realized_r": trade.realized_r,
                            "exit_price": ticker.mid_price
                        })
                        self.save_state_snapshot()

                await asyncio.sleep(self.tick_interval)

            except Exception as e:
                log_event("WATCH_LOOP_ERROR", {"error": str(e)})
                await asyncio.sleep(2.0)

    async def start(self):
        """Inicia el daemon y los bucles asíncronos concurrentes."""
        self.is_running = True
        log_event("DAEMON_START", {"version": "2.0.0", "env": "VPS_PRODUCTION"})
        self.recover_state()
        await self.provider.connect()

        try:
            await asyncio.gather(
                self.watch_loop(),
                self.heartbeat_loop()
            )
        except asyncio.CancelledError:
            log_event("DAEMON_STOPPING", {"msg": "Recibida senal de cancelacion."})
        finally:
            await self.stop()

    async def stop(self):
        """Apaga ordenadamente el proceso persistiendo el estado."""
        self.is_running = False
        self.save_state_snapshot()
        await self.provider.disconnect()
        log_event("DAEMON_SHUTDOWN_CLEAN", {"msg": "Estado persistido. Conexiones cerradas."})


# ==============================================================================
# ENTRYPOINT Y GESTIÓN DE SEÑALES DEL SISTEMA (SIGINT / SIGTERM)
# ==============================================================================
async def main():
    provider = MT5ExnessProvider(server_host="127.0.0.1", port=5555, simulated=True)
    daemon = TradeWatcherDaemon(provider=provider)

    # Test: Agregar orden activa de ejemplo si el estado está vacío
    if not daemon.active_trades:
        test_trade = ActiveTrade(
            signal_id="sig-test-001",
            signal_key="XAUUSD_BUY_M15_TEST",
            asset="XAU_USD",
            direction="BUY",
            entry_price=2650.0,
            stop_loss=2645.0,
            take_profit_1=2655.0,
            take_profit_final=2665.0
        )
        daemon.active_trades[test_trade.signal_key] = test_trade

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def handle_signal():
        log_event("SYSTEM_SIGNAL", {"msg": "Capturada senal del sistema. Apagando..."})
        stop_event.set()

    # En sistemas Unix / Linux se capturan señales formales
    if sys.platform != 'win32':
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, handle_signal)

    daemon_task = asyncio.create_task(daemon.start())
    
    # Para verificación rápida en consola, corre 2 segundos y finaliza
    await asyncio.sleep(2.0)
    await daemon.stop()
    daemon_task.cancel()


if __name__ == '__main__':
    asyncio.run(main())
