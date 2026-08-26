# AEON | Terminal de Inteligencia Macroeconómica, Mercados y Señales Cuantitativas

AEON es una plataforma profesional de inteligencia macroeconómica, análisis de mercados y señales cuantitativas diseñada para traders institucionales e inversores. Construida con una arquitectura de alto rendimiento (Frontend SPA en Vanilla JS / Vite, backend server-side en Supabase PostgreSQL con RLS/RPC y un motor cuantitativo 24/7 en Python con conector para MetaTrader 5 / Exness).

---

## 🏛️ Arquitectura del Sistema (Post-Fase 4)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ SERVIDOR DEDICADO VPS LINUX (Ubuntu 24.04 LTS / LD4 Londres)           │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │ MetaTrader 5 (Exness ECN) │ ◄──────►│ ZeroMQ / IPC Socket Server │  │
│  │  - Feed de Precios Live   │ (0.5ms) │  - Puerto Local 5555       │  │
│  └───────────────────────────┘         └─────────────▲──────────────┘  │
│                                                      │                 │
│  ┌───────────────────────────────────────────────────▼──────────────┐  │
│  │ AEON QUANT DAEMON (trade_watcher_daemon.py & market_intel)       │  │
│  │  - Bucle de evaluación asíncrono M5/M15 (Latencia < 100ms)       │  │
│  │  - Detector de Régimen Multivariado (ADX N=14 + ATR + SMA)       │  │
│  │  - Scoring Explicable 0-100 + Blackout Macro (+-15 min)          │  │
│  │  - Persistencia Atómica: data/trade_watcher_state.json           │  │
│  │  - Logging Estructurado JSON & Heartbeats cada 30s               │  │
│  └───────────────────────────────────────────────────▲──────────────┘  │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS / WebSockets
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL & EDGE FUNCTIONS                                   │
│  - Seguridad RLS Zero-Trust en todas las tablas                        │
│  - Agregación instantánea de Track Record vía RPC (0ms math lag)       │
│  - Realtime seguro con REPLICA IDENTITY FULL                           │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Feed Público & Niveles PRO Seguros
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL (Vite SPA / Vanilla JS / ES Modules)                     │
│  - 0ms White-Screen Cache en sessionStorage / localStorage             │
│  - Gráficos interactivos Lightweight Charts v5                         │
│  - Componentes accesibles y sanitizados contra XSS                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Suite Cuantitativa & Motores de Validación (`scripts/quant/`)

El repositorio cuenta con una suite matemática y cuantitativa completa para investigación, simulación de fricciones y supervisión de órdenes en producción:

| Script / Módulo | Descripción & Principios Científicos |
|---|---|
| 📐 [`scripts/quant/dpoc_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/dpoc_engine.py) | **Developing POC & Developing VWAP:** Motor acumulativo barra a barra con **Cero Look-Ahead Bias** certificado mediante pruebas unitarias. |
| 💸 [`scripts/quant/backtest_friction_engine.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/backtest_friction_engine.py) | **Simulador de Fricción Real:** Modela comisiones ECN de Exness Raw ($\$7.00/\text{lote}$ RT), spreads dinámicos por sesión, slippage estocástico y swaps nocturnos. |
| 🎲 [`scripts/quant/walk_forward_validator.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/walk_forward_validator.py) | **Validador OOS & Monte Carlo:** Ejecuta Walk-Forward Analysis ($WFE \ge 65\%$) y simulaciones de permutación (1.000 corridas) con límites de Drawdown $\le 12.0\%$. |
| 🧠 [`scripts/quant/market_intelligence.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/market_intelligence.py) | **Market Intelligence & Scoring 0–100:** Detector multivariado de régimen (ADX $N=14$ + ATR + $\text{SMA}_{20/50}$), correlador macro con **Blackout de $\pm 15$ min** ante noticias `HIGH`, y scoring explicable de 4 pilares. |
| 🔌 [`scripts/quant/data_provider.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/data_provider.py) | **Capa Abstracta DataProvider:** Desacopla los algoritmos del broker con modelos inmutables (`NormalizedTicker`, `NormalizedCandle`) y conector `MT5ExnessProvider`. |
| ⚙️ [`scripts/quant/trade_watcher_daemon.py`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/scripts/quant/trade_watcher_daemon.py) | **Daemon 24/7:** Ejecutor asíncrono (`asyncio`) con máquina de estados canónica (`ACTIVE` ➔ `HIT_TP1` ➔ `CLOSED_TP/BE/SL`), persistencia atómica y reconexión automática. |

---

## 🚀 Infraestructura de Despliegue en VPS (`deploy/`)

Para ejecutar el motor cuantitativo de forma continua en un servidor dedicado VPS Linux (Ubuntu 22.04 / 24.04):

* **Servicio systemd ([`deploy/aeon-quant-daemon.service`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/deploy/aeon-quant-daemon.service)):** Configurado con `Restart=always`, límites de 65.536 descriptores y aislamiento de proceso.
* **Contenedor Docker ([`deploy/Dockerfile`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/deploy/Dockerfile) & [`deploy/docker-compose.yml`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/deploy/docker-compose.yml)):** Imagen ligera basada en Python 3.11 Slim con usuario no-root y healthchecks integrados.

---

## 🔐 Base de Datos & Migraciones Declarativas (`supabase/migrations/`)

La infraestructura de datos en PostgreSQL se gestiona mediante migraciones declarativas versionadas en Git:

* [`supabase/migrations/00001_initial_schema_and_rls.sql`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/supabase/migrations/00001_initial_schema_and_rls.sql): Esquema relacional, políticas RLS Zero-Trust y trigger `protect_profile_tier` que previene escalaciones de privilegios desde el cliente.
* [`supabase/migrations/00002_track_record_rpc.sql`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/supabase/migrations/00002_track_record_rpc.sql): Función RPC `get_track_record_summary()` para agregar Win Rate, Profit Factor y Net R directamente en PostgreSQL con 0ms de lag.

---

## 🛠️ Guía de Inicio Rápido

### 1. Iniciar el Frontend Web
```bash
# 1. Instalar dependencias de Node
npm install

# 2. Iniciar servidor de desarrollo con Vite
npm run dev

# 3. Compilar para producción (Build verificado < 300ms)
npm run build
```

### 2. Ejecutar la Suite de Validación Cuantitativa
```bash
# Test de Cero Look-Ahead Bias en dPOC y dVWAP
python scripts/quant/dpoc_engine.py

# Simulación de fricciones reales y comisiones Exness Raw
python scripts/quant/backtest_friction_engine.py

# Certificación de Monte Carlo (1.000 iteraciones)
python scripts/quant/walk_forward_validator.py

# Prueba de Scoring Explicable 0-100 y Detector de Régimen
python scripts/quant/market_intelligence.py
```

### 3. Iniciar el Daemon 24/7 en Local o VPS
```bash
# Ejecución local / dry-run
python scripts/quant/trade_watcher_daemon.py

# Despliegue con Docker Compose
cd deploy
docker compose up -d --build
```

---

## 📁 Árbol de Directorios del Proyecto

```text
AEON/
├── deploy/                          # Infraestructura de despliegue en VPS
│   ├── Dockerfile                   # Imagen Docker para el Quant Daemon
│   ├── docker-compose.yml           # Orquestador con volúmenes persistentes
│   └── aeon-quant-daemon.service    # Archivo unitario systemd para Linux
├── docs/                            # Documentación viva y estándares
│   ├── CURRENT_STATE_VS_TARGET.md   # 🟢 Única fuente de verdad técnica del proyecto
│   ├── AEON_ROADMAP_V2.md           # 🗺️ Master Roadmap v2.0 activo
│   ├── CONVENTIONS.md               # 📐 Convenciones de código y tokens
│   └── archive/                     # 🗄️ Histórico de auditorías y especificaciones
├── scripts/
│   └── quant/                       # 🔬 Suite Cuantitativa & Motores de Producción
│       ├── data_provider.py         # Abstracción universal y adaptador MT5
│       ├── dpoc_engine.py           # Developing POC y VWAP acumulativo
│       ├── backtest_friction_engine.py # Modelo de fricciones reales Exness Raw
│       ├── walk_forward_validator.py# Walk-Forward y Monte Carlo (1.000 runs)
│       ├── market_intelligence.py   # Régimen multivariado y scoring 0-100
│       └── trade_watcher_daemon.py  # Daemon asíncrono 24/7
├── src/                             # Código fuente del Frontend SPA
│   ├── css/                         # Tokens Glassmorphic y estilos modulares
│   └── js/                          # Módulos ES6 (Auth, Servicios, Render, Chart)
├── supabase/
│   ├── functions/                   # Edge Functions (calendar-cleanup, proxies)
│   └── migrations/                  # Migraciones declarativas SQL y RLS
└── index.html, calendario.html...   # Páginas principales del terminal
```

---

## 🗺️ Estado del Roadmap Maestro v2.0

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ESTADO DE EJECUCIÓN DE FASES                                           │
├────────────────────────────────────────────────────────────────────────┤
│ [FASE 0] Seguridad, Secrets, Triggers y RLS Estricto     ➔ ✅ 100%     │
│ [FASE 1] Arquitectura, SIGNAL_STATUS, DataProvider & RPC ➔ ✅ 100%     │
│ [FASE 2] Quant Validation Lab (dPOC/dVWAP & Fricciones)  ➔ ✅ 100%     │
│ [FASE 3] Daemon 24/7 en VPS Linux & MT5 Exness Gateway   ➔ ✅ 100%     │
│ [FASE 4] Market Intelligence, Régimen & Scoring 0-100    ➔ ✅ 100%     │
│ [FASE 5] AI Platform & Daily Macro Briefing              ➔ ⏳ Próxima  │
│ [FASE 6] AEON Pro Terminal & Monetización Stripe         ➔ ⏳ Plan     │
│ [FASES 7-8] Futuros Centralizados (CME Order Flow Real)  ➔ ⏳ Plan     │
│ [FASE 9] High Reliability & Global Multi-Region Scale    ➔ ⏳ Plan     │
└────────────────────────────────────────────────────────────────────────┘
```
