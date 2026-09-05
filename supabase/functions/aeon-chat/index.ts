// ==============================================================================
// AEON · Supabase Edge Function: aeon-chat (Fase B + Multimodal V3)
// Versión: 3.0 — Grounding Real 100% en Base de Datos & Soporte Multimodal
// ==============================================================================
// Blindajes Implementados:
//  [x] 1. user_id extraído 100% de auth.getUser(token), NUNCA del body.
//  [x] 2. Suscripción Pro activa requerida antes de tocar la IA (fail fast).
//  [x] 3. Conteo atómico estrictamente monótono en Postgres (fail-closed).
//  [x] 4. Grounding REAL contra market_intelligence (columnas exactas: current_price, dpoc_price, session_vwap).
//  [x] 5. Inyección en tiempo real de daily_briefings (sentimiento de mercado y catalizadores digeridos).
//  [x] 6. Inyección de economic_calendar (eventos macro de alto impacto).
//  [x] 7. Soporte Multimodal: Recepción y análisis de capturas de gráficos técnicos con inlineData.
//  [x] 8. Regla cardinal anti-alucinación: Prohibido usar precios o estados de eventos fuera de los datos vivos.
//  [x] 9. responseSchema nativo en Gemini con enum cerrado y validación post-generación.
// ==============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --------------------------------------------------------------------------
// Configuración de CORS con Defensa en Profundidad
// --------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  "https://aeondev.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Categorías financieras legítimas aceptadas por el backend
const VALID_FINANCIAL_CATEGORIES = [
  "MACRO",
  "TECNICO_ORDERFLOW",
  "CATALIZADOR",
  "GESTION_RIESGO"
] as const;

// Respuesta canónica segura para jailbreaks, fuera de ámbito o anomalías
const STANDARD_REFUSAL_PAYLOAD = {
  categoria: "FUERA_DE_AMBITO",
  analisis: "Solo estoy autorizado para asistir en análisis macroeconómico, Order Flow, gráficos técnicos y gestión de riesgo institucional de AEON.",
  niveles_clave: [],
  advertencia_riesgo: "Consulta o imagen no clasificada dentro del ámbito financiero de AEON."
};

interface ChatRequestBody {
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  asset?: string;
  image?: {
    mimeType: string;
    data: string; // Base64 crudo
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Manejo de preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Solo permitir método POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const aiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // --------------------------------------------------------------------------
    // CAPA 1: Zero-Trust & Autenticación Server-Side
    // --------------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Token de sesión requerido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Sesión inválida o expirada." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifiedUserId = user.id;

    // --------------------------------------------------------------------------
    // CAPA 2: Validación de Suscripción PRO Activa (Fail Fast)
    // --------------------------------------------------------------------------
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tier")
      .eq("id", verifiedUserId)
      .maybeSingle();

    let isPro = profile?.tier === "pro" || profile?.tier === "institutional";

    if (!isPro) {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("status, plan, current_period_end")
        .eq("user_id", verifiedUserId)
        .eq("status", "active")
        .maybeSingle();

      if (sub && (sub.plan === "pro" || sub.plan === "institutional")) {
        const isPeriodValid = !sub.current_period_end || new Date(sub.current_period_end) >= new Date();
        if (isPeriodValid) isPro = true;
      }
    }

    if (!isPro) {
      return new Response(
        JSON.stringify({
          error: "pro_required",
          message: "El Asistente Cuantitativo IA es exclusivo para miembros AEON Pro.",
          upgrade_url: "/perfil.html"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------------------------------
    // CAPA 3: Validación de Payload y Soporte Multimodal
    // --------------------------------------------------------------------------
    const body: ChatRequestBody = await req.json();
    let userMessage = (body.message || "").trim();

    // Si viene imagen sin texto, generar prompt analítico predeterminado
    if (!userMessage && body.image?.data) {
      userMessage = "Analiza este gráfico técnico: identifica el activo, temporalidad, estructura de mercado, evalúa las zonas marcadas y proyecta escenarios de alta probabilidad con gestión de riesgo.";
    }

    if (!userMessage || userMessage.length < 2) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "El mensaje no puede estar vacío." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userMessage.length > 800) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "El mensaje excede el límite máximo de 800 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar imagen si viene adjunta
    let validInlineImage: { mimeType: string; data: string } | null = null;
    if (body.image?.data && body.image?.mimeType) {
      const allowedMimes = ["image/png", "image/jpeg", "image/webp"];
      if (!allowedMimes.includes(body.image.mimeType)) {
        return new Response(
          JSON.stringify({ error: "bad_request", message: "Formato de imagen no soportado (usa PNG, JPEG o WEBP)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Límite de 4MB de base64
      if (body.image.data.length > 4 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "bad_request", message: "La imagen excede el límite máximo de tamaño (4MB)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      validInlineImage = {
        mimeType: body.image.mimeType,
        data: body.image.data
      };
    }

    // --------------------------------------------------------------------------
    // CAPA 4: Conteo Atómico en Postgres (Anti-Spam 10s + Cuota Diaria 50)
    // --------------------------------------------------------------------------
    const { data: quotaResult, error: quotaError } = await supabaseAdmin.rpc(
      "check_and_increment_ai_quota",
      {
        p_user_id: verifiedUserId,
        p_daily_limit: 50,
        p_min_seconds_between_requests: 10
      }
    );

    if (quotaError || !quotaResult?.allowed) {
      return new Response(
        JSON.stringify({
          error: quotaResult?.reason || "quota_blocked",
          message: quotaResult?.message || "Límite de consultas o cooldown alcanzado.",
          retry_after: quotaResult?.retry_after ?? null,
          remaining: quotaResult?.remaining ?? 0
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------------------------------
    // CAPA 5: Live Market Grounding REAL (Columnas Exactas de la Base de Datos)
    // --------------------------------------------------------------------------
    const [marketRes, briefingRes, calendarRes] = await Promise.all([
      supabaseAdmin
        .from("market_intelligence")
        .select("symbol, display_name, current_price, change_24h_pct, bias, bias_score, support_1, support_2, resistance_1, resistance_2, dpoc_price, session_vwap, macro_driver, technical_thesis, cited_key_levels, last_updated")
        .in("symbol", ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "DXY", "SPX500", "NAS100", "US30", "BTCUSD", "USOIL"]),
      supabaseAdmin
        .from("daily_briefings")
        .select("title, macro_sentiment, catalysts, executive_thesis, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("economic_calendar")
        .select("country, event_name, impact, actual, forecast, previous, event_time")
        .order("event_time", { ascending: false })
        .limit(6)
    ]);

    const marketData = marketRes.data || [];
    const latestBriefing = briefingRes.data || null;
    const recentCalendar = calendarRes.data || [];

    const nowMs = Date.now();
    let marketFreshnessNotice = "ALERTA: Sin datos de mercado en vivo disponibles.";
    if (marketData && marketData.length > 0) {
      const timestamps = marketData
        .map(m => m.last_updated ? new Date(m.last_updated).getTime() : 0)
        .filter(t => !isNaN(t) && t > 0);

      if (timestamps.length > 0) {
        const oldestTimestamp = Math.min(...timestamps);
        const diffMinutes = Math.round((nowMs - oldestTimestamp) / 60000);
        if (diffMinutes > 20) {
          marketFreshnessNotice = `ALERTA DE LATENCIA: El dato más antiguo del lote tiene ${diffMinutes} minutos. Indicar en advertencia_riesgo que las cotizaciones pueden haber variado.`;
        } else {
          marketFreshnessNotice = "ESTADO: DATOS INSTITUCIONALES EN TIEMPO REAL CONECTADOS";
        }
      }
    }

    const requestedAsset = (body.asset || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    let sortedMarketData = [...marketData];
    if (requestedAsset) {
      sortedMarketData = sortedMarketData.sort((a, b) => 
        a.symbol.includes(requestedAsset) ? -1 : (b.symbol.includes(requestedAsset) ? 1 : 0)
      );
    }

    const marketContextSummary = sortedMarketData.map(m => {
      const p = m.current_price !== null && m.current_price !== undefined ? `$${m.current_price}` : 'N/A';
      const dpoc = m.dpoc_price ? `$${m.dpoc_price}` : 'N/A';
      const vwap = m.session_vwap ? `$${m.session_vwap}` : 'N/A';
      const r1 = m.resistance_1 || 'N/A';
      const r2 = m.resistance_2 || 'N/A';
      const s1 = m.support_1 || 'N/A';
      const s2 = m.support_2 || 'N/A';
      const thesis = m.technical_thesis || m.macro_driver || '';
      return `• ${m.symbol} (${m.display_name || m.symbol}): Precio Actual: ${p} | Sesgo: ${m.bias} (${m.bias_score || 50}/100) | dPOC: ${dpoc} | Session VWAP: ${vwap} | ZAP Resistencia: ${r1} - ${r2} | ZAP Soporte: ${s1} - ${s2}${thesis ? ` | Tesis: ${thesis}` : ''}`;
    }).join("\n");

    let macroContextSummary = "Sin briefing macroeconómico reciente.";
    if (latestBriefing) {
      const sentiment = latestBriefing.macro_sentiment?.label || 'NEUTRAL';
      const score = latestBriefing.macro_sentiment?.score || 50;
      const catalysts = Array.isArray(latestBriefing.catalysts) ? latestBriefing.catalysts : [];
      const catSummary = catalysts.slice(0, 5).map(c => 
        `  - ${c.title} (${c.currency || 'USD'}): Actual=${c.actual || 'Pendiente'} (Pronóstico: ${c.forecast || 'N/A'}, Previo: ${c.previous || 'N/A'}) [Estado: ${c.status === 'digested' ? 'DIGERIDO / YA PUBLICADO' : (c.status === 'live' ? 'PUBLICADO EN VIVO' : 'PRÓXIMO')}]`
      ).join("\n");

      macroContextSummary = `Título Briefing: ${latestBriefing.title}
Sentimiento Global: ${sentiment} (Puntaje: ${score}/100)
Tesis Ejecutiva: ${latestBriefing.executive_thesis || 'N/A'}
Catalizadores Clave Asimilados/Activos:
${catSummary}`;
    }

    let calendarContextSummary = "";
    if (recentCalendar.length > 0) {
      calendarContextSummary = "Eventos del Calendario Económico Recientes / Próximos:\n" + 
        recentCalendar.map(c => `  - [${c.country}] ${c.event_name} (${c.impact}): Actual: ${c.actual || 'Esperando'}, Previo: ${c.previous || 'N/A'}`).join("\n");
    }

    // --------------------------------------------------------------------------
    // CAPA 6: Sanitización de Historial
    // --------------------------------------------------------------------------
    const rawHistory = body.history || [];
    const sanitizedHistory: Array<{ role: "user" | "model"; parts: any[] }> = [];
    
    const candidateHistory = rawHistory.slice(-4);
    let expectedRole: "user" | "assistant" = "user";

    for (const h of candidateHistory) {
      if (h.role === expectedRole && h.content && h.content.trim()) {
        sanitizedHistory.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content.slice(0, 800) }]
        });
        expectedRole = expectedRole === "user" ? "assistant" : "user";
      }
    }

    if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === "user") {
      sanitizedHistory.pop();
    }

    // Construcción del mensaje actual del usuario (Texto + Imagen opcional)
    const currentUserParts: any[] = [{ text: userMessage }];
    if (validInlineImage) {
      currentUserParts.push({
        inlineData: {
          mimeType: validInlineImage.mimeType,
          data: validInlineImage.data
        }
      });
    }

    const contents = [
      ...sanitizedHistory,
      { role: "user", parts: currentUserParts }
    ];

    // --------------------------------------------------------------------------
    // CAPA 7: System Prompt Estricto & Anti-Alucinación
    // --------------------------------------------------------------------------
    const systemInstruction = `
Eres AEON Terminal AI, copiloto de Order Flow institucional, macroeconomía y gestión de riesgo para la plataforma AEON.
Asistes a traders profesionales con análisis cuantitativo riguroso, directo y fundamentado en datos en vivo.

[REGLAS CARDINALES DE EXACTITUD Y CERO ALUCINACIÓN]:
1. TIENES ACCESO A LA BASE DE DATOS INSTITUCIONAL EN VIVO DE AEON EN:
   - [DATOS DE MERCADO EN VIVO]
   - [CONTEXTO MACRO & BRIEFING]
   - [CALENDARIO ECONÓMICO]
2. ESTÁ TERMINANTEMENTE PROHIBIDO INVENTAR COTIZACIONES PASADAS DE TU ENTRENAMIENTO ANTIGUO (por ejemplo, Oro en $2700 es un precio antiguo; en la plataforma real cotiza en el rango de los $4400s provisto en los datos).
3. SI EL USUARIO CONSULTA POR UN ACTIVO (ej. XAUUSD, EURUSD, BTCUSD, SPX500), TUS NIVELES (Precio, dPOC, VWAP, ZAP Oferta, ZAP Demanda) DEBEN COINCIDIR EXACTAMENTE CON LOS NIVELES REALES INYECTADOS.
4. CATALIZADORES MACRO: Si un dato (como NFP o Nóminas no Agrícolas) figura como "DIGERIDO / YA PUBLICADO", NUNCA digas que está "por salir" ni lo trates como evento futuro. Explica con claridad cómo el mercado ya asimiló ese dato específico y qué reacción técnica provocó en el precio.
5. SÉ CONCISO Y DIRECTO: Máximo 130 palabras en 'analisis'. Formatea con claridad institucional.

[MÓDULO DE AUDITORÍA DE GRÁFICOS Y CAPTURAS DE PANTALLA]:
Si el usuario envía una imagen de un gráfico técnico (TradingView, MT4/MT5):
- Identifica activo, temporalidad visible y estructura (tendencia, consolidación, liquidez).
- Evalúa las zonas marcadas por el trader (Zonas ZAP, Order Blocks, FVGs, piscinas BSL/SSL).
- Valida o invalida la hipótesis del trader con base en Order Flow y confluencias objetivas.
- Si la imagen NO es un gráfico financiero, clasifica "categoria": "FUERA_DE_AMBITO".

[MÓDULO DE CÁLCULO DE LOTAJE]:
Si el usuario solicita calcular su lotaje:
- Fórmula: Riesgo en $ = Balance * (% Riesgo / 100). Lotaje = Riesgo en $ / (Pips SL * Valor Pip Lote Estándar).
- Forex: 1 lote = $10/pip. Oro Spot: 1 lote = 100 oz ($10/pip de 0.10). Índices: 1 lote = $1/pto.
- Si faltan datos (balance, % riesgo, pips SL), solicítalos con un ejemplo conciso.
- Clasifica "categoria": "GESTION_RIESGO" y desglosa el cálculo.

[DATOS DE MERCADO EN VIVO]:
${marketFreshnessNotice}
${marketContextSummary}

[CONTEXTO MACRO & BRIEFING]:
${macroContextSummary}

${calendarContextSummary}
`;

    // Invocación con modelos actualizados de Google Gemini y responseSchema nativo
    const models = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash"];
    let rawAiText = "";

    for (const model of models) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiApiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: contents,
            generationConfig: {
              maxOutputTokens: 1200,
              temperature: 0.1,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  categoria: {
                    type: "STRING",
                    enum: ["MACRO", "TECNICO_ORDERFLOW", "CATALIZADOR", "GESTION_RIESGO", "FUERA_DE_AMBITO"]
                  },
                  analisis: { type: "STRING" },
                  niveles_clave: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  },
                  advertencia_riesgo: { type: "STRING" }
                },
                required: ["categoria", "analisis", "niveles_clave", "advertencia_riesgo"]
              }
            }
          })
        });

        if (res.ok) {
          const aiJson = await res.json();
          const parts = aiJson.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.text && !p.thought) {
              rawAiText = p.text.trim();
              break;
            }
          }
          if (rawAiText) break;
        }
      } catch (_) {
        // Continuar con el siguiente modelo de respaldo
      }
    }

    if (!rawAiText) {
      throw new Error("No se pudo obtener respuesta de los modelos de IA.");
    }

    // --------------------------------------------------------------------------
    // CAPA 8: Guardrail Post-Generación Exhaustivo
    // --------------------------------------------------------------------------
    let finalPayload = STANDARD_REFUSAL_PAYLOAD;

    try {
      const jsonCandidate = JSON.parse(rawAiText);

      const isValidCategory = typeof jsonCandidate.categoria === "string" &&
        VALID_FINANCIAL_CATEGORIES.includes(jsonCandidate.categoria as any);

      const isValidAnalysis = typeof jsonCandidate.analisis === "string" &&
        jsonCandidate.analisis.trim().length > 0;

      const isValidLevels = Array.isArray(jsonCandidate.niveles_clave) &&
        jsonCandidate.niveles_clave.every((item: unknown) => typeof item === "string");

      const isValidRisk = typeof jsonCandidate.advertencia_riesgo === "string";

      if (isValidCategory && isValidAnalysis && isValidLevels && isValidRisk) {
        finalPayload = {
          categoria: jsonCandidate.categoria,
          analisis: jsonCandidate.analisis.slice(0, 1200).trim(),
          niveles_clave: jsonCandidate.niveles_clave.slice(0, 6),
          advertencia_riesgo: jsonCandidate.advertencia_riesgo.slice(0, 300).trim()
        };
      } else {
        finalPayload = STANDARD_REFUSAL_PAYLOAD;
      }
    } catch {
      finalPayload = STANDARD_REFUSAL_PAYLOAD;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: finalPayload,
        meta: {
          remaining_quota: quotaResult.remaining,
          requests_today: quotaResult.requests_today
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[AEON Chat Error]:", err);
    return new Response(
      JSON.stringify({ 
        error: "ai_service_unavailable", 
        message: errorMsg,
        details: err instanceof Error ? err.stack : null
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
