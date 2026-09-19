# 🏛️ Propuesta Estratégica: Upgrade Visual, Diagramación & Estandarización Senior para la Suite Documental de AEON

**Documento:** `docs/PROPUESTA_UPGRADE_VISUAL_DOCS_AEON.md`  
**Estado:** Propuesta de Mejora Arquitectónica para Evaluación  
**Origen:** Inspirado en la certificación de arquitectura del proyecto hermano `Chatbot WS` (TDD v2.1 calificado con **9.3 / 10** por Claude Opus 4.6).  

---

## 🎯 1. Objetivo Principal (Prioridad Alta)

Elevar la suite de documentación técnica de **AEON Terminal** al más alto nivel visual y pedagógico de la industria fintech/quant, transformando los documentos actuales (que son predominantemente de texto plano) en **documentos de diseño técnico (TDD) enriquecidos con diagramas Mermaid nativos, fórmulas en $\LaTeX$ ($\KaTeX$), matrices comparativas y alertas estandarizadas de GitHub**.

> [!NOTE]
> Este upgrade documental **NO modifica ninguna línea de código fuente, scripts de trading ni bases de datos en producción**. Es un enriquecimiento 100% no destructivo que incrementa el valor del activo intelectual de AEON ante socios, inversores o auditorías institucionales.

---

## 🎨 2. Hoja de Ruta de Mejoras Visuales por Documento

### A. [`docs/INDEX.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/INDEX.md)
* **Incorporar Diagrama de Navegación del Ecosistema (`flowchart TD`):**
  Visualizar gráficamente cómo se conectan los 11 documentos maestros: Gobernanza $\rightarrow$ Estándares de Ingeniería $\rightarrow$ Especificaciones de Mercados $\rightarrow$ Harness de Copilot $\rightarrow$ Bitácora Viva.
* **Badges y Semáforos de Estado:**
  Indicadores visuales de certificación (`Approved`, `Certified`, `Active`).

### B. [`docs/CURRENT_STATE_VS_TARGET.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/CURRENT_STATE_VS_TARGET.md)
* **Diagrama de Arquitectura de Contenedores (C4 N2):**
  Representación visual del flujo entre:
  $$\text{Brokers / APIs (OANDA, Binance, Coinbase)} \longrightarrow \text{VPS Autónomo (20s Engine)} \longrightarrow \text{Supabase Cloud (PostgreSQL)} \longrightarrow \text{Cloudflare Pages (Frontend)}$$
* **Diagrama de Secuencia de Ingesta:**
  Mostrar el ciclo de sincronización batch cada 20s y la mitigación de rate limits de TwelveData.

### C. [`docs/ENGINEERING_STANDARDS.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/ENGINEERING_STANDARDS.md)
* **Fórmulas Cuantitativas Formales en $\KaTeX$:**
  * Profit Factor: $PF = \frac{\sum \text{Ganancias Brutas}}{\sum |\text{Pérdidas Brutas}|} \ge 1.35$
  * Sharpe Ratio: $SR = \frac{E[R_p - R_f]}{\sigma_p} \ge 1.30$
  * Maximum Drawdown: $DD_{\text{max}} \le 12.0\%$
  * Algoritmo de Ratchet de 20s para MAE/MFE normalizado en múltiplos de $R$.
* **Alertas de Seguridad:**
  Bloques `[!WARNING]` y `[!CAUTION]` para blindar la regla Zero-Trust de llaves foráneas y RLS.

### D. [`docs/GUIA_HARNESS_ENGINEERING.md`](file:///c:/Users/indatech/Desktop/Proyectos/Fintech/AEON/docs/GUIA_HARNESS_ENGINEERING.md)
* **Diagrama de Ciclo ReAct del Copilot (`stateDiagram-v2`):**
  Estados del agente evaluador: `IDLE` $\rightarrow$ `CONTEXT_ASSEMBLY` $\rightarrow$ `TOOL_EXECUTION` $\rightarrow$ `GUARDRAILS_CHECK` $\rightarrow$ `RESPONSE`.
* **Diagrama Entidad-Relación (`erDiagram`):**
  Mapa visual de las tablas de Supabase (`public.trader_journal`, `public.trader_weekly_audits`, `public.profiles`, `public.signals`).

---

## ⚡ 3. Propuesta Tentativa / Futura (Prioridad Baja - En Evaluación)

### Migraciones SQL Automatizadas (*Migrations as Code*):
* **Concepto:** Evaluar a futuro la incorporación de un runner de migraciones automatizadas idempotentes (`npm run migrate` o script Python) con tabla de control `migrations_history`, similar a lo implementado en `Chatbot WS`.
* **Regla de Oro:** **No se implementará de forma inmediata.** Antes de dar cualquier paso en esta dirección, se redactará un plan formal y se consultará obligatoriamente con el **Arquitecto Técnico (Claude Opus 4.6)** para auditar y certificar que la lógica de esquemas no ponga en riesgo los datos de trading en vivo de la base de datos de AEON.

---

## 🤖 4. Instrucción para el Asistente AI que lea este archivo

Si el usuario abre una conversación en el entorno del **Proyecto AEON** y hace referencia a este archivo:
1. **Comprender el mandato:** El objetivo prioritario es **diseñar y enriquecer visualmente los documentos con diagramas Mermaid nativos y fórmulas LaTeX**, sin tocar código ni romper funcionalidad.
2. **Referencia Técnica:** Puedes consultar la carpeta hermana `c:\Users\indatech\Desktop\Chatbot WS\docs\` para ver ejemplos exactos del estilo visual, diagramas y redacción de alto impacto que obtuvieron la certificación de 9.3/10.
3. **Procedimiento:** Proponer la actualización de los documentos uno por uno para revisión del usuario.
