# AEON | Terminal de Inteligencia Cuantitativa Institucional & Contexto Macroeconómico (MAS v1.2.0)

AEON es una plataforma profesional de inteligencia macroeconómica, microestructura de Order Flow y contextualización cuantitativa en tiempo real diseñada para traders institucionales e inversores soberanos.

> 🏛️ **Declaración de Soberanía Institucional:**  
> **AEON no es un proveedor de señales ni un bot de ejecución ciega.** AEON es una **Terminal de Inteligencia Cuantitativa y Contexto Estructural**. Su misión es dotar al operador de datos cuantitativos crudos (ZAP, dPOC de volumen, session VWAP, piscinas de liquidez BSL/SSL, correlaciones macro) y análisis contextual multi-agente riguroso, neutral y desprovisto de juicios emocionales o promesas de retorno. El trader es el único general soberano que toma las decisiones de ejecución.

Construida con una arquitectura de alto rendimiento: Frontend SPA en Vanilla JS / Vite, backend server-side en Supabase PostgreSQL con RLS Zero-Trust, Edge Functions en Deno y un motor cuantitativo 24/7 en Python con ingesta batch de OANDA v20, Binance, Coinbase, St. Louis Fed FRED y Yahoo Finance.

---

## 🏛️ Capacidades y Módulos de la Plataforma

### 1. 🛰️ Terminal de Mercados & Microestructura Cuántica (17 Activos Globales)
* **Ingesta Multi-Activo en Tiempo Real:** 14 activos vía OANDA v20 en 1 sola llamada batch (Oro Spot `XAUUSD`, Plata Spot `XAGUSD`, Petróleo Crudo WTI `USOIL`, Divisas Mayores y Menores, Índices `SPX500`, `NAS100`, `US30`, `JP225`), Criptoactivos directos de Binance y Coinbase (`BTCUSD`, `ETHUSD`) y cálculo geométrico oficial ICE del Índice Dólar (`DXY`).
* **Microestructura Institucional:** Developing POC (dPOC) acumulativo barra a barra, Session VWAP en tiempo real, Zonas de Alta Probabilidad (ZAP Oferta / ZAP Demanda), Zonas de Absorción (S1/S2/R1/R2) y piscinas de liquidez BSL/SSL sin Look-Ahead Bias.
* **Terminal Gráfica (/analisis.html):** Curva continua en Canvas nativo (Lightweight Charts v5) para los 4 Reyes del Mercado (Oro, Bitcoin, Euro y Nasdaq) con actualización atómica in-place sin reseteo de scroll.

### 2. 🏛️ Macro Liquidity & Fed Yields HUD
* **Barómetros de la Reserva Federal:** Monitoreo continuo de los 5 pilares de liquidez institucional: Rendimiento del Bono a 10 Años (`US10Y`), Bono a 2 Años (`US02Y`), Tasa Efectiva de Fondos Federales (`FEDFUNDS`), Facilidad de Repo Inverso (`RRPONTSYD`) y Balance Total de Activos de la Fed (`WALCL`).
* **Alertas de Expansión y Contracción:** Detección en código de dinámicas de Quantitative Easing (QE) y Quantitative Tightening (QT), con modal interactivo y playbooks formativos de correlación con divisas, bonos y metales.

### 3. 🎯 Calendario Sniper & Detección de Fases de Mercado
* **Sondeo Event-Driven T-5m:** Aceleración automática de sondeo a alta frecuencia (cada 15s) en la ventana previa a catalizadores de alto impacto económico para captura inmediata del dato real (`Actual`).
* **Detección Automática de Sesiones Bursátiles:** Resolución de estados horarios UTC (`Asia-Pacífico / Tokio`, `Pre-Londres`, `Londres Activa`, `Pre-NY`, `Wall Street Activa`, `Cierre NY` y `Weekend Wrap de Fin de Semana` para criptoactivos).
* **Briefings Diarios Grounded:** Síntesis ejecutivas de sentimiento y catalizadores económicos ancladas estrictamente a los registros oficiales en base de datos.

### 4. 🤖 Copiloto Cuantitativo IA Multimodal (Edge Function `aeon-chat`)
* **Grounding 100% en Base de Datos Viva:** Inyección de precios en tiempo real, dPOC, VWAP y catalizadores económicos digeridos antes de inferir. Prohibición estricta de alucinación fuera de datos vivos.
* **Auditoría Cuantitativa de Escenarios:** Análisis desapasionado de hipótesis propuestas por el trader (Entrada, Invalidación SL, TP de liquidez y ratio R:R crudo).
* **Algoritmo de Cálculo de Lotaje Institucional:** Fórmulas matemáticas de contrato para Oro Spot (100 oz/lote), Forex e Índices con redondeo prudencial al micro-lote (0.01).
* **Auditoría Visual Multimodal:** Capacidad de recepción y análisis directo de capturas de pantalla de gráficos (TradingView / MT5 / MT6) vía Canvas cliente con compresión sub-50ms e `inlineData`.

### 5. 📓 Diario Cuántico & Copilot Logging (Harness Architecture)
* **Registro Conversacional de Trades:** El trader documenta sus entradas de forma natural en el chat (*"Entré en compra en XAUUSD en 2650 con SL 2642 y TP 2668"*).
* **Validación de Coherencia Direccional Pre-INSERT:** Rechazo determinista antes de tocar la base de datos si una orden no cumple `SL < Entry < TP` (BUY) o `TP < Entry < SL` (SELL).
* **Captura de Snapshot Cuántico Inmutable:** Al momento de la entrada, se sella en PostgreSQL el contexto exacto de mercado (dPOC, VWAP, sesgo institucional y catalizadores).
* **Ratchet de 20s en VPS (Costo Marginal \$0):** Monitoreo tick a tick del drawdown adverso (MAE) y máxima excursión favorable (MFE) en múltiplos de $R$.
* **Desambiguación Multi-Posición:** Cero adivinación silenciosa; si el trader opera múltiples posiciones en el mismo símbolo, el sistema solicita aclaración unívoca antes de cerrar o anular.
* **Agente Evaluador Post-Mortem Semanal:** Auditoría objetiva conversacional (*"Hazme el análisis de mis trades de la semana"*) que calcula Win Rate, R Neto, Profit Factor y disciplina con el dPOC, archivando métricas en el Command Center de `/perfil.html`.

### 6. 🛡️ Centinela Cuántico de Confluencias & Bus de Eventos en Tiempo Real
* **Escaneo en Tiempo Real:** Evaluación continua de confluencias de alta probabilidad ($Precio \in ZAP \land Barrido\ BSL/SSL \land dPOC$).
* **Fan-Out de Latencia Ultrabaja:** Worker no bloqueante que dispara síntesis táctica en Edge Function (`aeon-copilot-event`) en $<1.2\text{s}$.
* **Transmisión Reactiva:** Difusión a clientes web vía WebSockets (Supabase Realtime) con sintetizador de audio cyber (WebAudio API 880Hz–1760Hz), toast flotante con snooze y tarjetas tácticas desplegables.

### 7. 💳 Command Center del Trader & Pasarela Cripto
* **Dashboard Dark Luxury (`perfil.html`):** Pestañas accesibles WAI-ARIA (Membresía, Diario Cuántico, Seguridad y Preferencias).
* **Pasarela Binance Pay:** Proceso de suscripción PRO en 3 pasos con clickwrap legal, QR en alta definición y validación estricta de transferencias.
* **Panel de Administración Móvil (`admin-pagos.html`):** Gestión y activación de cuentas en un toque vía Stored Procedures atómicos.

---

## 🏛️ Arquitectura del Sistema

```text
┌────────────────────────────────────────────────────────────────────────┐
│ MOTOR AUTÓNOMO DE ALTA FRECUENCIA (scripts/ai/aeon_autonomous_engine)  │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │ OANDA v20 (Batch 14 Activos) ◄─────►│ Cripto APIs Públicas       │  │
│  │  - Metales, Energía, Forex│         │  - Binance (BTC)           │  │
│  │  - Índices Globales       │         │  - Coinbase (ETH)          │  │
│  └─────────────┬─────────────┘         └─────────────┬──────────────┘  │
│                │                                     │                 │
│  ┌─────────────▼─────────────────────────────────────▼──────────────┐  │
│  │ CEREBRO CUÁNTICO & AGENTES AUTÓNOMOS (17 Activos Globales)       │  │
│  │  1. Motor Cuántico Multi-Activo: dPOC, Session VWAP, ZAPs, DXY   │  │
│  │  2. Sincronizador Macro Liquidez Fed (US10Y, US02Y, WALCL, RRP)  │  │
│  │  3. Calendario Sniper: T-5m sondeo de alta frecuencia            │  │
│  │  4. Daily Briefings & Noticias: Grounding directo en BD          │  │
│  │  5. Centinela Cuántico de Confluencias: Fan-out en <1.2s         │  │
│  │  6. Ratchet de 20s para Trader Journal: Tracking MFE/MAE en RAM  │  │
│  └───────────────────────────────────────────────────▲──────────────┘  │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS / WebSockets
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL & EDGE FUNCTIONS (Nube)                            │
│  - Seguridad Zero-Trust RLS en todas las tablas                        │
│  - Tablas: trader_journal, trader_weekly_audits, market_intelligence,  │
│    macro_liquidity, daily_briefings, economic_calendar, news           │
│  - Bus de Eventos en Tiempo Real con REPLICA IDENTITY FULL             │
│  - Conteo atómico anti-spam y procedimientos RPC de cuotas             │
│  - Edge Functions en Deno:                                             │
│      • aeon-chat: Copiloto Cuantitativo & Trader Journal Harness       │
│      • aeon-copilot-event: Síntesis táctica y broadcast Realtime       │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Transmisión en Tiempo Real & WebSockets
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL WEB (Vite SPA / Vanilla JS / ES Modules)                 │
│  - Producción en Vercel: https://aeondev.vercel.app                    │
│  - Radar de Mercados Globales: 17 Activos con actualización in-place   │
│  - Terminal de Análisis Estructural (/analisis.html): Gráficos Canvas  │
│  - Macro Liquidity HUD: Panel de 5 barómetros Fed y modal formativo    │
│  - Widget de Chat Multimodal: Audio WebAudio, adjuntos de gráficos    │
│  - Command Center (/perfil.html): Métricas y Diario Cuántico en vivo   │
│  - Calendario Económico y Feed de Noticias Grounded                    │
│  - Cero Deuda Técnica: 0 inline styles, 0 !important, tokens CSS puros │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Comandos para Ejecutar el Stack Local

### 1. Iniciar el Servidor Web (Vite HMR)
```bash
npx vite --host 0.0.0.0 --port 5173
```
* **Acceso desde PC:** `http://localhost:5173`
* **Acceso desde Móvil (Misma red Wi-Fi):** `http://192.168.0.105:5173`

### 2. Iniciar el Motor Autónomo de Agentes (Python 3.11)
```bash
python scripts/ai/aeon_autonomous_engine.py
```
* Sincroniza los **17 activos** cada 20s (Oro Spot, Plata Spot, Petróleo WTI, Bitcoin, Ethereum, Índices y Forex).
* Sincroniza la **Macro Liquidez Fed** (US10Y, US02Y, FEDFUNDS, RRPONTSYD, WALCL).
* Ejecuta el **Ratchet de 20s** para auditar MFE y MAE en trades abiertos del diario.
* Ejecuta el **Centinela Cuántico de Confluencias** con alerta proactiva y fan-out a la Terminal Web.

### 3. Ejecutar la Batería Completa de Pruebas Unitarias
```bash
python -m unittest discover -s tests -p "test_*.py"
```
* Ejecuta las 4 suites automatizadas de regresión (28/28 tests pasando).

### 4. Compilar para Producción
```bash
npm run build
```

---

## 📚 Documentación Técnica de Referencia

* 📖 **[Bitácora de Desarrollo y Refactorizaciones](docs/AEON_CHANGELOG_BITACORA.md):** Registro histórico de hitos de arquitectura, optimizaciones y bugs resueltos.
* 🛡️ **[Guía de Harness Engineering](docs/GUIA_HARNESS_ENGINEERING.md):** Principios de diseño para agentes autónomos con memoria persistente y guardrails.
* 🏛️ **[Dossier del Trader Journal Harness](docs/DOSSIER_TRADER_JOURNAL_HARNESS.md):** Arquitectura detallada, modelo de datos relacional y dictamen técnico certificado.
* 🏛️ **[Estándares de Ingeniería](docs/ENGINEERING_STANDARDS.md):** Convenciones de código, políticas Zero-Trust RLS y directrices cuantitativas.
* 🗺️ **[Roadmap v2.0](docs/AEON_ROADMAP_V2.md):** Fases y directrices de desarrollo a largo plazo.
* 📐 **[Convenciones Técnicas](docs/CONVENTIONS.md):** Estándares de diseño, BEM, tokens CSS y protocolos de datos.
* 📋 **[Estado Actual vs Objetivo](docs/CURRENT_STATE_VS_TARGET.md):** Diagnóstico de arquitectura y cuadro de mando técnico del repositorio.

