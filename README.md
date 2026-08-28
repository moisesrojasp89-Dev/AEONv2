# AEON | Terminal de Inteligencia Macroeconómica, Mercados y Señales Cuantitativas

AEON es una plataforma profesional de inteligencia macroeconómica, análisis de mercados en tiempo real y señales cuantitativas diseñada para traders institucionales e inversores. Construida con una arquitectura de alto rendimiento (Frontend SPA en Vanilla JS / Vite, backend server-side en Supabase PostgreSQL con RLS/RPC y un motor cuantitativo y de inteligencia 24/7 en Python con conector para OANDA v20, Binance y feeds en vivo).

---

## 🏛️ Arquitectura del Sistema (AEON Real Intelligence v2.0)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ MOTOR AUTÓNOMO DE ALTA FRECUENCIA (scripts/ai/aeon_autonomous_engine)  │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │ OANDA v20 (Lote 12 Activos│ ◄──────►│ Binance Public API (BTC)   │  │
│  │  - Feed de Precios Live   │         │  - Ticker en Tiempo Real   │  │
│  └─────────────┬─────────────┘         └─────────────┬──────────────┘  │
│                │                                     │                 │
│  ┌─────────────▼─────────────────────────────────────▼──────────────┐  │
│  │ MÓDULOS DEL MOTOR DE AGENTES                                     │  │
│  │  1. Mercados (sync_markets_loop): Cada 20s en lote (0 TwelveData)│  │
│  │     - dPOC de Volumen, Session VWAP, S1/S2/R1/R2 deterministas   │  │
│  │  2. Calendario Sniper (sync_calendar_sniper): T-5m sondeo rápido │  │
│  │     - Captura de valor 'Actual' y recálculo de impacto macro     │  │
│  │  3. Briefing & Noticias (sync_macro_and_news): Fases de sesión   │  │
│  │     - Síntesis macro con Gemini 2.5 Flash / Fallback calibrado   │  │
│  └───────────────────────────────────────────────────▲──────────────┘  │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTPS / WebSockets
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL (Nube)                                             │
│  - Seguridad RLS Zero-Trust en todas las tablas                        │
│  - Agregación instantánea de Track Record vía RPC (0ms math lag)       │
│  - Realtime seguro con REPLICA IDENTITY FULL                           │
│  - Tablas: market_intelligence, daily_briefings, news, economic_cal... │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
                                       │ Transmisión en Tiempo Real
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AEON TERMINAL WEB (Vite SPA / Vanilla JS / ES Modules)                 │
│  - Producción en Vercel: https://aeondev.vercel.app                    │
│  - Entorno Local (Wi-Fi): http://192.168.1.8:5173                      │
│  - Menú Lateral Minimalista estilo Drawer Nexora con SVG vectoriales   │
│  - Carrusel Táctil Horizontal en Mercados (0 scroll vertical en móvil) │
│  - Gráficos interactivos Lightweight Charts v5                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Comandos para Ejecutar el Stack Local

### 1. Iniciar el Servidor Web (Vite HMR)
```bash
npx vite --host 0.0.0.0 --port 5173
```
* **Acceso desde PC:** `http://localhost:5173`
* **Acceso desde Móvil (Misma red Wi-Fi):** `http://192.168.1.8:5173`

### 2. Iniciar el Motor Autónomo de Agentes
```bash
python scripts/ai/aeon_autonomous_engine.py
```
* Sincroniza los 14 activos cada 20s (Oro Spot, Bitcoin, S&P 500, Nasdaq, Forex).
* Monitorea el calendario en Modo Sniper ($T-5\text{ min}$).
* Publica noticias contextualizadas y actualiza el briefing según la sesión activa (Tokio, Londres, NY).

---

## 📊 Estado de Ejecución del Roadmap

| Componente | Descripción | Estado |
|---|---|:---:|
| **Motor Autónomo VPS** | Ingesta batch OANDA + Binance, 0 TwelveData calls, Modo Sniper en Calendario. | ✅ **Operativo** |
| **Menú Móvil Nexora** | Drawer minimalista con iconos SVG vectoriales, píldora cian y tarjeta Pro. | ✅ **Desplegado** |
| **Mercados Móvil** | Carrusel horizontal táctil `86vw` con cero scroll vertical. | ✅ **Desplegado** |
| **Calendario Económico** | 74 eventos macro con failover atómico y widgets interactivos. | ✅ **Desplegado** |
| **Producción Vercel** | Despliegues automatizados desde `moisesrojasp89-Dev/AEONv2`. | ✅ **Verde (🟢 Ready)** |

---

## 📚 Documentación Técnica Adicional

* 📖 **[Bitácora de Desarrollo y Errores](docs/AEON_CHANGELOG_BITACORA.md):** Registro histórico de bugs, refactorizaciones y lecciones aprendidas.
* 🏛️ **[Estándares de Ingeniería](docs/ENGINEERING_STANDARDS.md):** Convenciones de código, seguridad RLS y gobernanza cuantitativa.
* 🗺️ **[Roadmap v2.0](docs/AEON_ROADMAP_V2.md):** Fases y arquitectura a largo plazo.
