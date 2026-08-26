# AEON — Guía de Despliegue y Operación del Daemon 24/7 en VPS Linux

**Documento:** `docs/AEON_VPS_DEPLOYMENT_GUIDE.md`  
**Estado:** Manual Técnico de Operaciones (Fase 3 de Roadmap v2.0)  
**Versión:** 1.0  
**Fecha:** 25 de Agosto de 2026  
**Componentes:** `TradeWatcherDaemon`, `MT5ExnessProvider`, `systemd`, `Docker Compose`  

---

## 1. Requisitos de Infraestructura VPS

| Especificación | Recomendado para Producción | Mínimo Requerido |
|---|---|---|
| **Sistema Operativo** | **Ubuntu 24.04 LTS** (o Ubuntu 22.04) | Debian 12 / Ubuntu 20.04 |
| **CPU** | **2 vCPUs** (Arquitectura x86_64) | 1 vCPU |
| **Memoria RAM** | **4 GB RAM** (Para MT5 + Daemon) | 2 GB RAM |
| **Almacenamiento** | **40 GB NVMe SSD** | 20 GB SSD |
| **Ubicación Datacenter** | **Londres (LD4)** o **Frankfurt (FR2)** | Cualquier región < 50ms a Exness |
| **Disponibilidad** | **99.95% Uptime SLA** | 99.9% |

---

## 2. Diagrama de Arquitectura en VPS

```text
┌────────────────────────────────────────────────────────────────────────┐
│ SERVIDOR DEDICADO VPS LINUX (Ubuntu 24.04 LTS)                         │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │ MetaTrader 5 (Exness ECN) │ ◄──────►│ ZeroMQ / IPC Socket Server │  │
│  │  - Conexión Broker Live   │ (0.5ms) │  - Puerto Local 5555       │  │
│  └───────────────────────────┘         └─────────────▲──────────────┘  │
│                                                      │                 │
│  ┌───────────────────────────────────────────────────▼──────────────┐  │
│  │ AEON TRADE WATCHER DAEMON (trade_watcher_daemon.py)              │  │
│  │  - Bucle Asíncrono M5/M15 (Latencia < 100ms)                     │  │
│  │  - Máquina de Estados Canónica (ACTIVE ➔ HIT_TP1 ➔ CLOSED_TP/BE) │  │
│  │  - Persistencia Atómica: data/trade_watcher_state.json           │  │
│  │  - Pulsos de Telemetría Heartbeat (cada 30s)                     │  │
│  └───────────────────────────────────────────────────▲──────────────┘  │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS / WSS
                                                       ▼
                             ┌──────────────────────────────────┐
                             │ SUPABASE POSTGRESQL & REALTIME   │
                             │  - RLS Security & WebSockets     │
                             └──────────────────────────────────┘
```

---

## 3. Despliegue con systemd (Nativo en Host)

### Paso 1: Clonar y Configurar Entorno
```bash
# 1. Crear usuario dedicado
sudo useradd -r -s /bin/bash aeon
sudo mkdir -p /opt/aeon/data
sudo chown -R aeon:aeon /opt/aeon

# 2. Copiar archivos del proyecto a /opt/aeon
cd /opt/aeon
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install numpy dataclasses-json
```

### Paso 2: Configurar Variables de Entorno (`/opt/aeon/.env`)
```bash
sudo tee /opt/aeon/.env > /dev/null << 'EOF'
TZ=UTC
SUPABASE_URL=https://[TU_PROYECTO].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[TU_SERVICE_ROLE_KEY]
MT5_SERVER_HOST=127.0.0.1
MT5_SERVER_PORT=5555
EOF
sudo chmod 600 /opt/aeon/.env
sudo chown aeon:aeon /opt/aeon/.env
```

### Paso 3: Instalar y Activar el Servicio systemd
```bash
# Copiar archivo unitario
sudo cp deploy/aeon-quant-daemon.service /etc/systemd/system/

# Recargar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable aeon-quant-daemon
sudo systemctl start aeon-quant-daemon

# Verificar estado
sudo systemctl status aeon-quant-daemon
```

---

## 4. Despliegue con Docker Compose (Contenedor Aislado)

```bash
# Iniciar contenedor en segundo plano
cd deploy
docker compose up -d --build

# Ver logs estructurados en vivo
docker compose logs -f aeon-trade-watcher
```

---

## 5. Comandos de Operación y Monitoreo Forense

### Ver Logs Estructurados JSON en Vivo:
```bash
sudo journalctl -u aeon-quant-daemon -f -o cat
```

### Forzar Reinicio y Verificar Recuperación de Estado Atómica:
```bash
sudo systemctl restart aeon-quant-daemon
# El log emitirá: {"event": "STATE_RECOVERED", "recovered_trades_count": N}
```

### Comprobar Archivo de Snapshot de Estado:
```bash
cat /opt/aeon/data/trade_watcher_state.json
```

---

## 6. Procedimiento de Contingencia ante Caídas

1. **Reinicio Automático:** `systemd` y `Docker` reiniciarán el proceso en $< 5\text{s}$ ante fallos (`Restart=always`).
2. **Cero Pérdida de Trades:** En el arranque, `TradeWatcherDaemon.recover_state()` carga las órdenes vivas del archivo atómico `.json` y reconcilia con la base de datos de Supabase.
3. **Mantenimiento de Break-Even:** Si una orden ya alcanzó `HIT_TP1`, el Stop Loss en Break-Even permanece intacto tras cualquier reinicio.
