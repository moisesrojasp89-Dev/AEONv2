# 🗺️ AEON — Estructura Completa del Proyecto y Mapa del Código Fuente

**Documento:** `docs/ESTRUCTURA_DEL_PROYECTO.md`  
**Estado:** Especificación Normativa de Topología y Mapeo de Archivos  
**Versión:** 2.2.0 (Certificación de Ingeniería Senior)  
**Fecha de Aprobación:** Septiembre de 2026  
**Ámbito:** Arquitectura Integral (Frontend Web, CSS, JavaScript, Daemons Python, Supabase y Despliegue)  

---

> [!NOTE]
> Este documento proporciona una radiografía exhaustiva de cada archivo y directorio del repositorio de **AEON Terminal**, explicando su rol arquitectónico, dependencias e interacción en tiempo de ejecución.

---

## 🌳 1. Árbol de Directorios del Repositorio

```text
AEON/
├── 🌐 Vistas HTML (Multi-Page Application)
│   ├── index.html                           # Landing page & Terminal Principal (Radar, Briefings, Playbooks)
│   ├── mercados.html                        # Radar Institucional Extendido (17 Activos en Vivo)
│   ├── analisis.html                        # Terminal de Análisis Estructural (Lightweight Charts v5)
│   ├── calendario.html                      # Calendario Macroeconómico Sniper 24h & Catalizadores Tier 1
│   ├── perfil.html                          # Command Center del Trader & AI Trader Journal (4 KPI Cards)
│   ├── admin-pagos.html                     # Panel Administrativo Móvil para Aprobación de Pagos Cripto
│   ├── login.html                           # Inicio de Sesión Soberano (Supabase Auth)
│   ├── registro.html                        # Registro de Usuarios con Validaciones Sanitizadas
│   ├── recuperar.html                       # Solicitud de Recuperación de Contraseña por Correo
│   ├── actualizar-password.html             # Restablecimiento Seguro de Contraseña
│   ├── terminos.html                        # Términos y Condiciones Contractuales PRO (Clickwrap Legal)
│   ├── privacidad.html                      # Política de Privacidad y Tratamiento de Datos
│   ├── aviso-legal.html                     # Descargo No-Financial-Advice (NFA) y Riesgo Operativo
│   ├── cookies.html                         # Política de Almacenamiento Local y Cookies
│   └── 404.html                             # Página de Error Personalizada Dark Luxury
│
├── 🎨 src/css/ (Design System & Hojas de Estilo BEM)
│   ├── variables.css                        # Tokens Canónicos: Colores, Tipografías, Radios y Z-Index
│   ├── reset.css                            # Normalización CSS Universal
│   ├── layout.css                           # Contenedores Flexbox/Grid y Espaciado Global
│   ├── responsive.css                       # Media Queries y Adaptación Móvil Específica
│   ├── animations.css                       # Keyframes, Shimmers y Pulso Cian Reactivo (.card-live-pulse)
│   ├── auth.css                             # Estilos para Pantallas de Login, Registro y Recuperación
│   └── components/                          # Hojas de Estilo Modulares por Componente
│       ├── navbar.css                       # Barra de Navegación Sticky, Drawer Móvil y Badges
│       ├── hero.css                         # Hero Section, Glassmorphism y Micro-HUDs
│       ├── ticker.css                       # Cinta Marquee Continua Acelerada por GPU
│       ├── market.css                       # Tarjetas de Activos, Selectores de Clase y Tags ZAP
│       ├── analysis.css                     # Contenedor del Gráfico Canvas LW v5 y Paneles POI
│       ├── calendar.css                     # Grillas del Calendario Macro y Badges de Impacto
│       ├── chat.css                         # Widget Flotante del Copilot, Toasts y Modales
│       ├── perfil.css                       # Command Center del Trader, Pestañas ARIA y Bitácora
│       ├── macro-hud.css                    # Monitor HUD de las 5 Joyitas del Banco Central (Fed)
│       ├── education.css                    # Carrusel Horizontal de Playbooks Operativos con Scroll-Snap
│       ├── buttons.css                      # Variantes de Botones (.btn-primary, .btn-secondary, etc.)
│       ├── form-controls.css                # Inputs, Selects y Modales Accesibles
│       ├── footer.css                       # Pie de Página Institucional y Enlaces Legales
│       ├── legal.css                        # Tipografía y Contenedores de Lectura Legal
│       ├── premium.css                      # Modales de Checkout y Paywalls Freemium vs PRO
│       └── sidebar-widget.css               # Widgets Laterales y Paneles Desplegables
│
├── ⚡ src/js/ (Lógica de Aplicación Frontend - Vanilla JS Modular)
│   ├── main.js                              # Orquestador Principal de index.html (L1 Cache & Boot)
│   ├── markets.js                           # Controlador del Radar de 17 Activos (mercados.html)
│   ├── analysis.js                          # Controlador del Gráfico Canvas y POI ZAP (analisis.html)
│   ├── calendar.js                          # Controlador del Calendario Sniper (calendario.html)
│   ├── perfil.js                            # Controlador del Command Center y Diario Cuántico (perfil.html)
│   ├── admin-pagos.js                       # Lógica de Validación Administrativa de Pagos Cripto
│   ├── auth.js                              # Servicio de Autenticación, Manejo de Sesión y Tier Check
│   ├── navbar.js                            # Hidratación Centralizada, Drawer Móvil y Lazy Loading Copilot
│   ├── supabaseClient.js                    # Instancia Singleton de Conexión a Supabase US East
│   ├── chart.js                             # Envoltorio del Motor Canvas Lightweight Charts v5
│   ├── prices.js                            # Polling y Normalización de Ticks en Cliente
│   ├── render.js                            # Pipeline de Renderizado y Actualización de DOM
│   │
│   ├── components/                          # Componentes Interactivos Complejos
│   │   ├── chatWidget.js                    # Copiloto IA Flotante, WebAudio Chime, Snooze y Paywalls
│   │   └── educationModal.js                # Modal Interactivo para los Playbooks Operativos
│   │
│   ├── config/                              # Configuración Tipada y Constantes Inmutables
│   │   └── constants.js                     # Enums de Señales, Nombres de Tablas DB y Timers
│   │
│   ├── services/                            # Capa de Comunicación con APIs y Base de Datos
│   │   ├── marketService.js                 # Consumo de Cotizaciones, L1 Cache con TTL 60s
│   │   ├── marketsService.js                # Filtrado de 17 Activos y Agrupación por Sector
│   │   ├── analysisService.js               # Carga de POI Cuantitativos y JSONB cited_key_levels
│   │   ├── calendarService.js               # Filtrado de 24h y Catalizadores Semanales Digeridos
│   │   ├── chatService.js                   # Despacho Seguro a Edge Function aeon-chat con JWT
│   │   ├── macroLiquidityService.js         # Lectura de Métricas del Fed HUD (US10Y, WALCL, etc.)
│   │   ├── newsService.js                   # Sincronización de Noticias Grounded y Tags
│   │   └── briefingService.js               # Obtención de Informes de Apertura y Cierre
│   │
│   ├── templates/                           # Generadores Puros de HTML con Sanitización XSS
│   │   ├── marketCard.js                    # Template de Tarjeta de Mercado Reactiva in-place
│   │   ├── market.js                        # Layout de Tarjetas y Tickers Secundarios
│   │   ├── analysisCard.js                  # Tarjeta de Escenarios Cuantitativos y Niveles Clave
│   │   ├── calendarItem.js                  # Filas del Calendario con Micro-Badges de Impacto
│   │   ├── news.js                          # Tarjetas de Noticias con Selector Móvil Dark Luxury
│   │   ├── briefingCard.js                  # Tarjeta de Daily Briefings Institucionales
│   │   ├── ticker.js                        # Elementos del Marquee con Escape de Entidades
│   │   ├── education.js                     # Tarjetas de Playbooks con Badges SVG
│   │   ├── macroLiquidityHUD.js             # Renderizado del HUD de Macro Liquidez
│   │   └── navbar.js                        # Estructura de Navegación Dinámica según Auth State
│   │
│   └── utils/                               # Utilidades de Seguridad y Formato
│       └── sanitize.js                      # escapeHTML(), sanitizeUrl() y Validadores RegExp
│
├── 📦 src/data/ (Snapshots Estáticos de Resiliencia Offline)
│   ├── market_intelligence_snapshot.json    # Snapshot de Emergencia de los 17 Activos
│   ├── analysis_snapshot.json               # Snapshot de POI y Gráficos Estructurales
│   ├── economic_calendar_snapshot.json      # Snapshot de Eventos Macroeconómicos
│   ├── macro_liquidity_snapshot.json        # Snapshot de Indicadores de la Reserva Federal
│   ├── markets.json                         # Metadatos Fijos de Instrumentos (Tickers, Nombres, Pips)
│   ├── education.json                       # Contenido Estructurado de los 5 Playbooks Operativos
│   └── harness_sentinel_state.json          # Archivo de Telemetría y Cooldowns del Centinela
│
├── 🐍 scripts/ (Daemons Autónomos 24/7 & Laboratorio Cuantitativo)
│   ├── ai/                                  # Motores de Inteligencia Artificial y Sincronización
│   │   ├── aeon_autonomous_engine.py        # Motor Principal 20s (OANDA Batch + Binance, 0 TwelveData)
│   │   ├── trader_journal_harness.py        # Ratchet de 20s en RAM (MFE/MAE en R) & Evaluator Agent
│   │   ├── briefing_agent.py                # Generador de Briefings de Apertura y Sesión
│   │   ├── calibration_agent.py             # Calibración de Parámetros Cuantitativos
│   │   ├── news_sync_agent.py               # Ingesta y Grounding de Titulares Financieros
│   │   ├── markets_sync_agent.py            # Sincronización de Respaldo para Mercados
│   │   └── local_dev_daemon.py              # Daemon Ligero para Entornos Locales de Desarrollo
│   │
│   ├── quant/                               # Algoritmos Cuantitativos Puros (0 Look-Ahead Bias)
│   │   ├── harness_sentinel.py              # Centinela 24/7 (ZAP + BSL/SSL, Timeout 3.0s & Fan-Out)
│   │   ├── dpoc_engine.py                   # Developing POC & Developing VWAP Barra a Barra
│   │   ├── backtest_friction_engine.py      # Simulación Exness Raw ($7/lote + Spread + Slippage)
│   │   ├── walk_forward_validator.py        # Validador WFO en 10 Ventanas y Monte Carlo (1.000 iters)
│   │   ├── market_intelligence.py           # Detector Multivariado de Régimen (ADX, ATR, Medias)
│   │   ├── post_mortem_engine.py            # Auditoría Forense Post-Trade de Niveles Citados
│   │   ├── data_provider.py                 # Abstracción de Datos Cuantitativos Inmutables
│   │   ├── institutional_backtest_lab.py    # Laboratorio Integral de Estrategias Institucionales
│   │   └── production_strategies_audit.py   # Auditor de Calidad Cuantitativa (Quality Gates)
│   │
│   ├── db/                                  # Scripts SQL de Creación y Mantenimiento de Tablas
│   │   ├── create_macro_liquidity_tables.sql
│   │   └── create_market_intelligence_tables.sql
│   │
│   └── archive/                             # Scripts y Respaldos Históricos Archivados
│       ├── trade_watcher_daemon.py          # Daemon Legacy Reemplazado por MAS v1.3.0
│       └── backup_signals_pre_drop.json     # Backup Forense de Señales Previas a la Purga
│
├── ☁️ supabase/ (Infraestructura Soberana de Base de Datos & Edge Functions)
│   ├── config.toml                          # Configuración del CLI de Supabase
│   ├── clean_master_schema.sql              # Esquema Maestro Consolidado
│   │
│   ├── functions/                           # Edge Functions Serverless (Deno / TypeScript)
│   │   ├── aeon-chat/index.ts               # Copiloto Institucional: Tier Check, JWT & Cuotas Atómicas
│   │   ├── aeon-copilot-event/index.ts      # Fan-Out Táctico: Inferencia Flash-Lite e Idempotencia
│   │   ├── calendar-cleanup/index.ts        # Cron Job Nocturno de Purga y Mantenimiento
│   │   ├── oanda/index.ts                   # Proxy Seguro hacia la API de OANDA
│   │   └── twelvedata/index.ts              # Proxy de Emergencia para Feeds Secundarios
│   │
│   └── migrations/                          # Migraciones SQL Versionadas e Idempotentes
│       ├── 00001_initial_schema_and_rls.sql
│       ├── 00002_track_record_rpc.sql
│       ├── 00003_daily_briefings_schema.sql
│       ├── 00004_user_ai_usage_and_quota.sql
│       ├── 00005_crypto_payments.sql
│       ├── 00006_admin_panel.sql
│       ├── 00006_ai_quota_refund_and_security_hardening.sql
│       ├── 00007_telegram_payment_alerts.sql
│       ├── 00008_realtime_payments_profiles.sql
│       ├── 00009_macro_liquidity.sql
│       ├── 00010_active_copilot_harness_events_and_journal.sql
│       ├── 00011_signal_cooldowns_and_mas_schema.sql
│       ├── 00012_signal_post_mortem_and_ratchet.sql
│       ├── 00013_trader_journal_harness_mas.sql
│       └── 20260916000001_purge_legacy_signals_tables.sql
│
├── 🧪 tests/ (Batería de Pruebas Automatizadas)
│   ├── test_harness_mas.py                  # Pruebas Unitarias del Orquestador MAS y Event Bus
│   ├── test_trader_journal_harness.py       # Pruebas del Ratchet 20s, MFE/MAE y Evaluator Agent
│   ├── test_mas_anti_oracle_and_context.py  # Verificación de Guardrails Duros y Anti-Oracle Lock
│   └── test_post_mortem_mas.py              # Validación de Auditoría Forense de Niveles
│
├── 🚀 deploy/ (Infraestructura de Servidor VPS Linux)
│   ├── Dockerfile                           # Imagen de Contenedor para Daemons Python
│   ├── docker-compose.yml                   # Orquestación de Servicios Aislados en VPS
│   └── aeon-quant-daemon.service            # Configuración de Servicio Systemd para Linux
│
├── 📚 docs/ (Suite de Documentación Técnica Senior)
│   ├── INDEX.md                             # Índice Maestro y Mapa de Gobernanza
│   ├── ESTRUCTURA_DEL_PROYECTO.md           # Este Documento (Topología Completa del Código)
│   ├── CURRENT_STATE_VS_TARGET.md           # Diagnóstico en Tiempo Real, C4 N2 y Secuencias
│   ├── ENGINEERING_STANDARDS.md             # Estándares Cuantitativos KaTeX y Quality Gates
│   ├── GUIA_HARNESS_ENGINEERING.md          # Especificación de Sistemas Agénticos y ERD Supabase
│   ├── AEON_ROADMAP_V2.md                   # Roadmap Maestro de Ingeniería Fases 0 a 9
│   ├── CONVENTIONS.md                       # Convenciones de Nomenclatura, Estilo y Commits
│   ├── GUIA_ARQUITECTURA_Y_BUENAS_PRACTICAS_VIBE_CODING.md # Doctrina de Vibe Coding Riguroso
│   ├── AEON_CHANGELOG_BITACORA.md           # Bitácora Cronológica de 26 Hitos de Ingeniería
│   ├── ANALISIS_PURGA_SENALES.md            # Certificación de Erradicación del Paradigma Señalero
│   ├── DOSSIER_TRADER_JOURNAL_HARNESS.md    # Especificación del AI Trader Journal y Memoria Copilot
│   ├── INFORME_VERIFICACION_Y_PLAN_FASE_2_3.md # Informe Formal de Auditoría y Verificación
│   ├── PROPUESTA_UPGRADE_VISUAL_DOCS_AEON.md # Propuesta Inicial de Mejora Visual
│   └── archive/                             # Documentación Histórica y Especificaciones v1.0
│
├── ⚙️ Archivos de Configuración Raíz
│   ├── package.json                         # Dependencias NPM, Scripts de Build y Lint
│   ├── package-lock.json                    # Árbol Bloqueado de Dependencias JS
│   ├── vite.config.js                       # Configuración de Compilación Multi-Página de Vite
│   ├── requirements.txt                     # Dependencias de Python para Motores Cuantitativos
│   ├── .env.example                         # Plantilla Pública de Variables de Entorno
│   ├── .gitignore                           # Exclusiones Estrictas de Git (Credenciales y Builds)
│   └── README.md                            # Resumen Institucional del Repositorio
```

---

## 🔍 2. Responsabilidad de Componentes por Capas

### A. Capa de Presentación (Frontend Multi-Página)
* **Arquitectura:** Multi-Page Application (MPA) optimizada con Vite para compilación en $< 400\text{ms}$.
* **Filosofía de Renderizado:** Vanilla JavaScript modular con separación estricta entre Servicios (`services/`), Controladores (`js/`) y Plantillas (`templates/`).
* **Seguridad:** Cero uso de frameworks pesados vulnerables; toda inyección de contenido pasa por sanitización determinista (`escapeHTML`).

### B. Capa de Servicios & Estado
* **Almacenamiento Local (L1 Cache):** `sessionStorage` con TTL de 60s en el radar de mercados para minimizar peticiones redundantes.
* **Manejo de Ticks:** Reemplazo atómico *in-place* (`card.replaceWith(newCard)`) con pulso cian reactivo, preservando la posición de scroll del usuario.
* **Copiloto Activo:** Componente singleton montado en el `#navbar-root` de todas las páginas mediante carga diferida (`requestIdleCallback`).

### C. Capa de Cómputo Cuantitativo (VPS Linux 24/7)
* **Daemon Central (`aeon_autonomous_engine.py`):** Ejecuta un bucle continuo de 20 segundos que consulta cotizaciones en un único batch HTTP consolidado, actualiza dPOC y VWAP en memoria, evalúa el HUD de liquidez y persiste en Supabase.
* **Centinela Cuántico (`harness_sentinel.py`):** Escanea los 17 activos en busca de confluencias de Order Block (ZAP) y barridos de liquidez institucional (BSL/SSL). Dispara eventos al bus con worker thread no bloqueante (timeout 3.0s).
* **Ratchet de 20s (`trader_journal_harness.py`):** Monitorea trades abiertos en RAM y actualiza la excursión favorable ($MFE_R$) y adversa ($MAE_R$) en base de datos sin consumo de tokens de IA.

### D. Capa de Persistencia & Eventos (Supabase Soberano US East)
* **Seguridad:** Políticas Row-Level Security (RLS) en el 100% de las tablas relacionales.
* **Event Bus en Tiempo Real:** Tabla `public.trading_signal_events` conectada a Supabase Realtime para notificaciones push instantáneas a los navegadores conectados.
* **Edge Functions:** Intercepción determinista Pre-LLM en `aeon-chat` que ejecuta comandos estructurados en $<100\text{ms}$ a costo \$0.
