# AEON — PRODUCT & TECHNICAL MASTER PLAN v2.0
## Macro, Markets, Intelligence, Trading & Mobile

**Documento maestro para evolución del proyecto**

**Estado:** Proyecto existente en desarrollo  
**Versión:** 2.0  
**Objetivo:** Evolucionar AEON desde una plataforma visual de calendario, mercados y señales educativas hacia una plataforma profesional de inteligencia macroeconómica y de mercados, con IA, agentes especializados, análisis cuantitativo y herramientas educativas.

---

# 1. VISIÓN GENERAL

AEON no debe convertirse en otra web de noticias financieras, otra plataforma de señales ni otro chatbot genérico con temática de Trading.

La visión es construir una **plataforma de inteligencia financiera y de mercados**, inicialmente orientada a traders e inversores de Latinoamérica, pero con una arquitectura capaz de escalar hacia un producto internacional.

AEON debe combinar:

- Macroeconomía
- Mercados financieros
- Trading
- Futuros
- CFD
- Forex
- Índices
- Commodities
- Order Flow
- Trading cuantitativo
- Educación
- Inteligencia artificial
- Agentes especializados
- Research
- Briefings
- Calendario económico
- Análisis contextual

La filosofía central debe ser:

> **AEON no debe decirle al usuario simplemente qué está pasando. Debe ayudarle a entender por qué está pasando, qué factores importan y cómo interpretar el contexto.**

AEON debe priorizar **contexto, datos, explicación y educación** sobre promesas de rentabilidad o señales ciegas.

---

# 2. POSICIONAMIENTO DE MARCA

AEON debe proyectar:

### Profesionalidad
No debe parecer una plataforma de señales de Telegram ni una web de "gurú Trading".

### Inteligencia
La IA debe sentirse como una capa de inteligencia sobre datos reales, no como un chatbot decorativo.

### Precisión
Los datos financieros deben provenir de fuentes confiables y estar correctamente estructurados.

### Sobriedad
Evitar exageraciones como:
- "Gana dinero con IA"
- "Señal 100% segura"
- "Nunca pierdas"
- "La IA sabe hacia dónde va el mercado"

### Educación
AEON debe ayudar al usuario a desarrollar criterio propio.

### Tecnología
La interfaz debe transmitir que AEON es una plataforma moderna de inteligencia financiera.

---

# 3. PERSONALIDAD DE AEON

AEON debe sentirse como:

> **Un terminal moderno de inteligencia financiera, accesible para el trader individual.**

No debe intentar copiar visualmente a Bloomberg o Reuters.

La estética premium actual debe mantenerse y evolucionar:

- Dark mode
- Glassmorphism utilizado con moderación
- Space Grotesk
- Inter
- Microinteracciones
- Animaciones discretas
- Visualización de datos
- Jerarquía clara
- Sensación de terminal moderno

La estética nunca debe estar por encima de la funcionalidad.

---

# 4. PRINCIPIO FUNDAMENTAL DE DESARROLLO

## NO RECONSTRUIR AEON DESDE CERO.

El proyecto actual contiene trabajo válido y debe conservarse.

Antes de modificar cualquier sistema:

1. Analizar el código existente.
2. Comprender dependencias.
3. Identificar qué funciona.
4. Identificar deuda técnica.
5. Identificar qué debe mantenerse.
6. Identificar qué necesita refactor.
7. Crear un plan.
8. Implementar por módulos.
9. Probar.
10. Hacer commit.

### Regla

> **Evolucionar antes que reemplazar.**

No eliminar código funcional solamente porque exista una arquitectura más elegante.

---

# 5. ESTADO ACTUAL DE AEON

## Stack

### Frontend
- Vanilla HTML5
- CSS3
- JavaScript ES6 Modules
- Vite

No introducir React, Next.js u otro framework solamente por moda. Si en el futuro existe una razón técnica real para migrar, debe justificarse antes.

### Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase RLS

### Hosting
- Vercel

### Market visualization
- TradingView Lightweight Scripts

---

# 6. ARQUITECTURA ACTUAL

Actualmente existe:

```text
/
├── index.html
├── calendario.html
├── login.html
├── registro.html
├── dashboard.html
│
└── src/
    ├── css/
    │   ├── variables.css
    │   ├── reset.css
    │   ├── layout.css
    │   ├── animations.css
    │   ├── responsive.css
    │   └── components/
    │
    ├── js/
    │   ├── main.js
    │   ├── calendar.js
    │   ├── supabaseClient.js
    │   ├── auth.js
    │   ├── render.js
    │   └── templates/
    │
    └── data/
        └── markets.json
```

El proyecto ya evolucionó parcialmente desde datos mock hacia Supabase.

El calendario económico actualmente utiliza:

```text
Supabase PostgreSQL
        ↓
economic_calendar
        ↓
calendar.js
        ↓
UI
```

Existe además un scraper en desarrollo utilizando Playwright.

---

# 7. ARQUITECTURA OBJETIVO

AEON debe evolucionar progresivamente hacia:

```text
                  AEON
                    │
          ┌─────────┴─────────┐
          │                   │
       FRONTEND             BACKEND
          │                   │
          │             DATA PLATFORM
          │                   │
          │       ┌───────────┼───────────┐
          │       │           │           │
          │    Macro       Markets      News
          │       │           │           │
          │       └───────────┼───────────┘
          │                   │
          │             NORMALIZATION
          │                   │
          │             ANALYTICS ENGINE
          │                   │
          │       ┌───────────┼───────────┐
          │       │           │           │
          │     Macro       Quant     Market Data
          │                   │
          │              AI PLATFORM
          │                   │
          │        ┌──────────┼──────────┐
          │        │          │          │
          │     Agents      Router     RAG
          │        │          │          │
          │        └──────────┼──────────┘
          │                   │
          └─────────────── AEON UI
```

Esta arquitectura **no debe construirse de una vez**. Debe evolucionar fase por fase.

---

# 8. PRINCIPIO DATA-FIRST

Uno de los principios técnicos más importantes de AEON será:

> **Los cálculos deterministas deben realizarse con código y datos estructurados; la IA debe interpretar, contextualizar y razonar sobre esos resultados.**

No utilizar un LLM para hacer cálculos que un programa puede realizar mejor.

Ejemplo:

```text
Precio
Volumen
VWAP
RSI
ATR
Delta
Open Interest
Structure
DXY
Yields
Economic Calendar
News
        ↓
DATA / QUANT ENGINE
        ↓
Datos estructurados
        ↓
AI
        ↓
Interpretación
```

La IA no debe inventar los indicadores.

---

# 9. EVOLUCIÓN DE AEON

La evolución prevista se divide en fases.

## PHASE 0 — AUDITORÍA Y ESTABILIZACIÓN

### Objetivo
Entender completamente el proyecto antes de introducir cambios importantes.

### El agente debe:
- Analizar todo el repositorio.
- Analizar estructura.
- Analizar dependencias.
- Revisar Vite.
- Revisar Supabase.
- Revisar autenticación.
- Revisar calendario.
- Revisar responsive.
- Revisar manejo de datos.
- Revisar seguridad.
- Revisar variables de entorno.
- Revisar código duplicado.
- Identificar hardcoding.
- Identificar deuda técnica.

### Importante
NO modificar masivamente el proyecto durante esta fase.

Primero producir:

**AEON Architecture Audit**

con:
- fortalezas
- problemas
- riesgos
- deuda técnica
- prioridades
- recomendaciones

---

## PHASE 1 — FOUNDATION

Objetivo: convertir la arquitectura existente en una base sólida para crecer.

### Tareas
- Normalizar estructura.
- Revisar módulos JS.
- Revisar servicios.
- Separar datos de presentación.
- Eliminar hardcoding innecesario.
- Crear convenciones.
- Revisar manejo de errores.
- Centralizar configuración.
- Revisar Supabase.
- Revisar RLS.
- Revisar Auth.
- Revisar estados de carga.
- Revisar logging.

No realizar una reescritura completa.

---

## PHASE 2 — DATA PLATFORM

AEON necesita dejar de depender progresivamente de datos mock.

Construir una capa de datos.

### Fuentes futuras
- Economic Calendar
- Market Data
- Macro Data
- News
- Central Banks
- Yields
- FX
- Indices
- Commodities
- Futures

Crear una capa de normalización:

```text
Provider A
Provider B
Provider C
       ↓
DATA ADAPTERS
       ↓
NORMALIZED DATA
       ↓
AEON DATA MODEL
```

AEON no debe acoplar todo el frontend a un proveedor específico.

---

## PHASE 3 — ECONOMIC CALENDAR

Convertir el calendario en uno de los pilares de AEON.

Actualmente existe `economic_calendar`.

Debe evolucionar hacia:
- eventos
- impacto
- país
- categoría
- consenso
- anterior
- actual
- timestamps
- fuente
- estado
- importancia

Añadir progresivamente:
- Próximo catalizador
- Impact map
- Contexto del evento
- Historial
- Reacciones históricas
- Relación con activos

Ejemplo:

```text
US CPI
 ↓
USD
 ↓
DXY
 ↓
Treasuries
 ↓
Gold
 ↓
Nasdaq
 ↓
BTC
```

---

## PHASE 4 — MARKET INTELLIGENCE

Construir el núcleo de mercados.

### FX
EURUSD, GBPUSD, USDJPY, etc.

### Índices
Nasdaq, S&P 500, Dow, DAX, etc.

### Commodities
Gold, Oil, Silver.

### Crypto
Si se decide incorporarlo estratégicamente.

### Futures
Especialmente importante para la visión futura de AEON.

---

## PHASE 5 — BRIEFING

El Briefing debe evolucionar desde un feed visual hacia un sistema de inteligencia.

Pipeline:

```text
NEWS
+
CALENDAR
+
MARKET DATA
+
MACRO DATA
        ↓
CLASSIFICATION
        ↓
RELEVANCE
        ↓
CONTEXT
        ↓
AI ANALYSIS
        ↓
AEON BRIEFING
```

El briefing debe responder:
- Qué ocurrió
- Por qué importa
- Qué mercados están reaccionando
- Qué vigilar
- Qué eventos vienen
- Qué escenarios existen

Nunca presentar escenarios como certezas.

---

## PHASE 6 — AI PLATFORM

Crear una capa de IA modular.

No crear un único chatbot gigante.

Arquitectura:

```text
                  AI ROUTER
                     │
       ┌─────────────┼─────────────┐
       │             │             │
     MODEL A       MODEL B       MODEL C
       │             │             │
       └─────────────┼─────────────┘
                     │
                  AGENTS
```

---

# 10. AGENTES DE AEON

### Macro Agent
Analiza:
- inflación
- empleo
- crecimiento
- bancos centrales
- liquidez
- yields
- DXY

### Market Agent
Analiza:
- precio
- estructura
- volatilidad
- momentum
- correlaciones

### News Agent
Clasifica y contextualiza noticias.

### Calendar Agent
Analiza eventos económicos.

### Futures Agent
Especializado en:
- Futures
- Open Interest
- Volume
- Market Profile
- Delta
- Footprint
- Order Flow

### Quant Agent
Especializado en:
- estadística
- backtesting
- factores
- señales cuantitativas
- métricas
- probabilidades

### Education Agent
Explica conceptos y enseña al usuario.

---

# 11. ORDER FLOW Y FUTURES

Línea estratégica para diferenciar AEON.

Investigar y desarrollar posteriormente capacidades relacionadas con:
- Futures
- Order Flow
- Volume Profile
- Market Profile
- Footprint
- Delta
- Cumulative Delta
- Open Interest
- Liquidity
- Auction Market Theory
- Market Microstructure

No construir todo inmediatamente.

Primero investigar proveedores de datos y viabilidad técnica, especialmente:
- calidad
- latencia
- profundidad
- licencias
- costes
- redistribución de datos

La adquisición de datos profesionales puede convertirse en uno de los costes importantes del producto.

---

# PHASE 7 — QUANT ENGINE

El motor cuantitativo debe estar separado de los LLM.

```text
Market Data
     ↓
Python / Quant Engine
     ↓
Calculations
     ↓
Signals / Features
     ↓
AI Interpretation
```

La IA puede:
- explicar
- comparar
- contextualizar
- investigar
- generar hipótesis

Pero el cálculo debe ser reproducible.

---

# PHASE 8 — MOBILE READINESS + MOBILE PLATFORM

AEON debe diseñarse desde ahora como una plataforma Web + Mobile, aunque el desarrollo móvil se ejecute en una etapa posterior.

## Principio

```text
WEB ──────────┐
              ├──→ AEON BACKEND / API ──→ DATA + AUTH + AI
MOBILE ───────┘
```

La aplicación no debe convertirse en un proyecto independiente ni en una simple copia de la web. Debe consumir los mismos servicios, datos, usuarios, watchlists, entitlements y capacidades de IA.

## Momento adecuado

Comenzar la implementación móvil cuando estén suficientemente maduros:

- Auth
- Supabase
- APIs
- Data Layer
- Calendar Services
- Market Services
- Briefing backend
- AI endpoints
- User entitlements

## Mobile Readiness Audit

Antes de construir la app, auditar:

- lógica atada al frontend
- servicios que deben convertirse en APIs
- reutilización de modelos de datos
- Auth
- usuarios
- watchlists
- entitlements
- notificaciones
- configuración
- dependencias
- seguridad móvil
- posibles bloqueos para iOS/Android

## AEON Mobile V1

La primera versión debe priorizar:

### Home
- Market overview
- Briefing
- principales movimientos
- próximos catalizadores

### Calendar
- eventos
- impacto
- actual/consenso/previo
- próximo catalizador
- contexto

### Markets
- Forex
- índices
- commodities
- crypto si corresponde

### AEON Intelligence
- consultas al asistente
- análisis contextual
- briefing

### Watchlist
- activos favoritos

### Notifications
- eventos de alto impacto
- publicaciones de datos
- nuevos briefings
- alertas de mercado
- cambios relevantes

El móvil debe aprovechar especialmente Push Notifications, Watchlists, alertas, acceso rápido a IA y consultas rápidas de mercado.

## App Store + Google Play

La hoja de ruta debe contemplar distribución oficial en:

- Apple App Store
- Google Play Store

Y considerar:
- cuentas de desarrollador
- certificados y signing
- environments
- beta testing
- TestFlight
- Google Play testing
- privacidad
- permisos
- push notifications
- analytics
- crash reporting
- metadata de las tiendas
- releases

## Tecnología mobile

No decidir prematuramente el framework. Evaluar cuando llegue esta fase:

### Capacitor
Reutilización de parte del frontend web y menor salto inicial.

### React Native / Expo
Experiencia móvil dedicada y ecosistema amplio.

### Flutter
Alternativa multiplataforma sólida.

La decisión debe basarse en arquitectura existente, reutilización, rendimiento, mantenimiento, UX, capacidades nativas, coste y requisitos de las tiendas.

---

# PHASE 9 — EDUCATION

Crear una verdadera plataforma educativa.

Categorías:
- Trading Fundamentals
- Macro
- Technical Analysis
- Risk Management
- Futures
- Order Flow
- Quant Trading
- Market Psychology
- AI for Trading

Cada contenido debe tener:
- explicación
- ejemplos
- gráficos
- ejercicios
- quizzes
- casos prácticos

La IA puede convertirse en tutor.

---

# PHASE 10 — AEON AI CHAT

Crear un chatbot propio.

No debe ser simplemente:

```text
Usuario
 ↓
GPT
```

Debe ser:

```text
Usuario
 ↓
AEON AI
 ↓
Intent Detection
 ↓
Context Retrieval
 ↓
Data Retrieval
 ↓
AI Router
 ↓
Specialized Agent
 ↓
Response
```

Ejemplo:

> "¿Qué está moviendo al oro hoy?"

AEON debería poder combinar:
- precio
- DXY
- yields
- calendario
- noticias
- contexto macro

antes de responder.

---

# 10.1. MODELO DE CONSUMO DEL CHAT

La IA de AEON debe tener un sistema de consumo controlado.

Posible modelo:

### Free
Acceso limitado.

### Pro
Mayor cantidad de consultas.

### Advanced / Intelligence
Mayor profundidad.

### Credits
Consumo adicional.

Esto permite controlar:
- coste IA
- coste datos
- coste infraestructura

por usuario.

---

# PHASE 11 — STRIPE + PRO + ENTITLEMENTS

Integrar:
- Stripe Checkout
- Webhooks
- Supabase
- Tiers
- Entitlements

Flujo:

```text
Usuario
 ↓
Stripe
 ↓
Webhook
 ↓
Backend
 ↓
Supabase
 ↓
User Tier
 ↓
AEON
```

Nunca confiar únicamente en el frontend para determinar si un usuario es Pro.

---

## Mobile Billing + Entitlements

El sistema de membresías debe prepararse para múltiples canales:

```text
                    AEON ENTITLEMENTS
                           │
             ┌─────────────┼─────────────┐
             │             │             │
           WEB           iOS         Android
         Stripe       Apple IAP    Google Play
             │             │             │
             └─────────────┼─────────────┘
                           ↓
                        Backend
                           ↓
                        Supabase
                           ↓
                       User Tier
```

El usuario debe tener un entitlement de AEON independientemente del canal de adquisición, respetando las políticas de cada plataforma. No diseñar el billing web de forma que obligue a reconstruir posteriormente el sistema de acceso para móvil.

# PHASE 12 — DASHBOARD / AEON TERMINAL

El dashboard será el centro privado de AEON.

Debe integrar progresivamente:
- Market overview
- Briefing
- Calendar
- Watchlist
- Signals/Ideas
- AI Chat
- Education
- Market analysis
- Futures
- Quant
- Profile
- Usage/Credits

No construir todo de una vez.

---

# 13. SEÑALES

AEON puede ofrecer señales o ideas de mercado, pero el posicionamiento debe ser responsable.

No:

> "COMPRA XAUUSD AHORA — 100%"

Sí:

> **AEON Market Setup**

Con:
- contexto
- tesis
- niveles
- invalidación
- escenarios
- riesgo
- factores a favor
- factores en contra
- horizonte temporal

La señal debe ser presentada como información/educación y análisis, no como garantía de resultados.

---

# 14. AI ROUTER

AEON no debería depender de un único proveedor.

```text
AEON AI
   ↓
AI ROUTER
   │
   ├── OpenAI
   ├── Anthropic
   ├── Google
   └── otros proveedores
```

El router debe seleccionar modelo según:
- complejidad
- coste
- latencia
- contexto
- tarea
- disponibilidad

Principio:

> **El modelo más barato que pueda resolver correctamente la tarea debe ser el modelo utilizado.**

---

# 15. AGENTES EN TIEMPO REAL

No crear agentes que estén ejecutándose constantemente sin necesidad.

Usar:
- cron jobs
- queues
- event triggers
- caching
- batch processing

Ejemplo:

```text
1000 noticias
 ↓
modelo barato
 ↓
100 relevantes
 ↓
modelo medio
 ↓
20 importantes
 ↓
modelo potente
 ↓
5 insights
```

Esto reduce costes considerablemente.

---

# 16. DESARROLLO DE AEON CON IA

Metodología:

# PLAN → APPROVE → IMPLEMENT → TEST → REVIEW → COMMIT

No:

# IMPLEMENT EVERYTHING → HOPE IT WORKS

---

# 17. ROLES DE IA PARA EL DESARROLLO

### Architect
Modelo potente.
Responsable de:
- arquitectura
- decisiones complejas
- diseño de sistemas

### Builder
Modelo eficiente.
Responsable de:
- implementación
- componentes
- APIs
- refactors

### Reviewer
Modelo independiente.
Responsable de:
- seguridad
- errores
- arquitectura
- calidad

### Tester
Responsable de:
- tests
- edge cases
- regresiones

El mismo proveedor puede cumplir distintos roles.

---

# 18. HERRAMIENTAS DE DESARROLLO

El workflow actual puede mantenerse:

### VS Code
Editor principal.

### Antigravity
Entorno agentic con acceso a modelos Google/Claude disponibles.

### Claude Code
Agente de desarrollo.

### Git/GitHub
Fuente de verdad.

### Supabase
Backend/database/auth.

### Vercel
Deployment.

No introducir herramientas nuevas si no existe una necesidad concreta.

---

# 19. REGLAS PARA LOS AGENTES

1. No eliminar funcionalidad existente sin justificación.
2. No hacer reescrituras completas sin aprobación.
3. No cambiar múltiples sistemas críticos simultáneamente.
4. Antes de modificaciones grandes, analizar y presentar plan.
5. Mantener modularidad.
6. No hardcodear datos que deberían venir de una fuente dinámica.
7. No duplicar lógica.
8. No introducir dependencias innecesarias.
9. No exponer secrets/API keys.
10. Toda funcionalidad nueva debe tener manejo de errores.
11. Probar antes de considerar terminada una tarea.
12. Hacer commits pequeños y descriptivos.

---

# 20. SEGURIDAD

## Lecciones recientes

Durante la evolución del proyecto se detectaron fugas de credenciales relacionadas con OANDA, Twelve Data y la `service_role` de Supabase. Estas credenciales fueron rotadas/cambiadas.

Esto debe considerarse una lección arquitectónica permanente. Rotar una key resuelve la credencial comprometida, pero también hay que revisar historial de Git, builds, Vercel, logs y cualquier lugar donde pudo quedar expuesta.


Especial atención a:
- Supabase RLS
- Auth
- API keys
- Environment variables
- Stripe webhooks
- Server-side validation
- Rate limiting
- AI usage limits
- Prompt injection
- Data poisoning
- External API failures
- Logging
- Abuse prevention

Nunca colocar claves privadas en:
- frontend
- HTML
- JavaScript público
- Git

---

# 21. OBSERVABILIDAD

A medida que AEON crezca será necesario registrar:
- errores
- API failures
- latencia
- coste IA
- tokens
- uso por usuario
- errores de agentes
- jobs fallidos
- scraper failures
- datos faltantes

Especialmente:

> **coste de IA por usuario**

Esto será fundamental para definir precios.

---

# 22. MODELO ECONÓMICO FUTURO

Diseñar alrededor de:

```text
Revenue per user
        >
AI cost
+
Data cost
+
Infrastructure
+
Payment fees
```

Posible estructura:

```text
FREE
 ↓
PRO
 ↓
ADVANCED
 ↓
AI CREDITS
```

No ofrecer IA ilimitada sin conocer el coste.

---

# 23. LATAM COMO MERCADO INICIAL

AEON puede tener una ventaja importante al enfocarse inicialmente en Latinoamérica.

Considerar:
- español como idioma principal
- instrumentos relevantes para traders LATAM
- CFDs
- Forex
- índices
- commodities
- educación accesible
- horarios de mercados
- contexto macro internacional

La arquitectura debe permitir internacionalización posterior.

---

# 24. CFD + FUTURES

No escoger solamente uno.

### CFD
Mercado accesible y relevante para gran parte del público objetivo.

### Futures
Capa profesional y diferenciadora.

La plataforma puede comenzar con CFD/Forex/indices/commodities y evolucionar hacia:

**Futures → Order Flow → Quant → Market Microstructure.**

---

# 25. DIFERENCIACIÓN

AEON no debe competir únicamente por:

> "Tenemos señales."

Debe competir por:

> **Contexto + datos + IA + educación + herramientas profesionales.**

El diferencial debe estar en conectar información que normalmente está fragmentada.

Ejemplo:

```text
CPI
 ↓
Macro
 ↓
DXY
 ↓
Yields
 ↓
Gold
 ↓
Nasdaq
 ↓
Futures
 ↓
Order Flow
 ↓
AI interpretation
```

---

# 26. LO QUE NO DEBEMOS HACER

AEON no debe convertirse en:

- Un clon de TradingView.
- Un clon de Bloomberg.
- Un agregador de noticias.
- Un chatbot genérico.
- Una fábrica de señales.
- Una web saturada de indicadores.
- Una colección de agentes sin propósito.
- Una aplicación que depende completamente de un proveedor de IA.
- Una arquitectura donde el frontend contiene toda la lógica.
- Un proyecto construido mediante reescrituras constantes.

---

# 27. PRINCIPIO FINAL

AEON debe evolucionar de:

```text
WEB
```

hacia:

```text
PLATFORM
```

y finalmente:

```text
INTELLIGENCE PLATFORM
```

La progresión debe ser:

```text
Información
     ↓
Datos
     ↓
Contexto
     ↓
Análisis
     ↓
Inteligencia
     ↓
Educación
     ↓
Herramientas profesionales
```

---

# 28. ROADMAP MAESTRO v2

El roadmap es una dirección estratégica. No significa implementar todo inmediatamente. Algunas capacidades deben prepararse antes de su fase formal.

```text
PHASE 0
Auditoría + Seguridad + Estabilización
        ↓
PHASE 1
Foundation + Mobile Readiness
        ↓
PHASE 2
Data Platform
        ↓
PHASE 3
Economic Calendar
        ↓
PHASE 4
Market Intelligence
        ↓
PHASE 5
AI Briefing
        ↓
PHASE 6
AI Platform / Agents
        ↓
PHASE 7
Quant Engine
        ↓
PHASE 8
Mobile Platform / iOS / Android
        ↓
PHASE 9
Education
        ↓
PHASE 10
AEON AI Chat
        ↓
PHASE 11
Payments / Pro / Entitlements
        ↓
PHASE 12
AEON Terminal / Dashboard
        ↓
PHASE 13+
Futures / Order Flow / Advanced Intelligence
```

### Dependencias estratégicas

- Mobile Readiness comienza en Foundation.
- Security comienza inmediatamente y no es una fase que se considere completamente terminada.
- Data Architecture comienza antes de Market Intelligence.
- AI Architecture debe diseñarse antes de construir agentes complejos.
- Entitlements deben considerarse antes de lanzar pagos.
- Web y Mobile deben compartir backend, datos, Auth y lógica de negocio.

---

# 29. PRIORIDADES

### Prioridad crítica
- Seguridad
- Arquitectura
- Datos
- Auth
- RLS
- Calendar
- Market Data
- Mobile readiness

### Prioridad alta
- Market Intelligence
- Briefing
- Dashboard
- Education
- AI foundation
- Pro

### Prioridad estratégica
- AI Agents
- Quant
- Futures
- Order Flow
- Market Microstructure
- Mobile app

### Prioridad futura
- Automatizaciones avanzadas
- Personalización extrema
- Sistemas predictivos experimentales

---

# 30. INSTRUCCIÓN FINAL PARA EL AGENTE

**Este documento NO es una orden para implementar todo el roadmap.**

Primero:

1. Lee este `AEON_MASTER_PLAN.md`.
2. Lee `README.md`.
3. Lee `docs/CURRENT_STATE_VS_TARGET.md` si existe.
4. Audita el repositorio actual.
5. Comprende completamente la arquitectura existente.
6. Identifica qué partes del Master Plan ya están implementadas.
7. Identifica qué partes están parcialmente implementadas.
8. Identifica qué partes todavía no existen.
9. Identifica deuda técnica.
10. Identifica riesgos de seguridad.
11. Identifica riesgos de escalabilidad.
12. Identifica riesgos para Mobile.
13. Identifica qué partes deben conservarse.
14. Identifica qué partes deben refactorizarse.
15. Identifica qué infraestructura debe construirse antes de añadir IA avanzada.

Después, actualizar o crear:

`docs/CURRENT_STATE_VS_TARGET.md`

El documento debe comparar:

- Estado actual
- Arquitectura actual
- Arquitectura objetivo
- Funcionalidades actuales
- Funcionalidades objetivo
- Qué conservar
- Qué refactorizar
- Qué construir
- Riesgos
- Dependencias
- Prioridades
- Mobile Readiness
- Data Readiness
- AI Readiness
- Security Readiness

### MUY IMPORTANTE

NO hacer una reescritura.

NO eliminar funcionalidades existentes.

NO instalar dependencias importantes sin justificarlo.

NO implementar Futures, Order Flow, Quant, Mobile o agentes avanzados solamente porque aparecen en este documento.

Primero debe determinarse qué infraestructura hace falta.

Después debe proponerse un plan concreto de implementación.

**No ejecutar modificaciones importantes hasta que el plan sea revisado y aprobado.**

---

# PRINCIPIO MAESTRO DE AEON

> **Construir lentamente la infraestructura correcta para poder construir rápidamente las funcionalidades futuras.**

AEON no busca ser simplemente una página bonita con IA.

Busca convertirse progresivamente en una **plataforma seria de inteligencia macroeconómica y de mercados**, donde datos reales, análisis cuantitativo, inteligencia artificial, educación, herramientas de trading y experiencias Web/Mobile estén conectados dentro de una arquitectura modular, escalable, segura y económicamente sostenible.

**No destruir lo construido.  
No correr detrás de la moda.  
No añadir IA por añadir IA.  
No construir una app separada de la plataforma.  
No depender de un único proveedor.  
No exponer secretos.  
Construir una plataforma.**
