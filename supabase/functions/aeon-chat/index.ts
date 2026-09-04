// ==============================================================================
// AEON · Supabase Edge Function: aeon-chat (Fase B)
// Versión: 2.1 — Producción Definitiva (Auditada Línea por Línea por el Arquitecto)
// ==============================================================================
// Blindajes Implementados:
//  [x] 1. user_id extraído 100% de auth.getUser(token), NUNCA del body.
//  [x] 2. Suscripción Pro activa requerida antes de tocar la IA (fail fast).
//  [x] 3. Conteo atómico estrictamente monótono (fail-closed, sin rollback explotable).
//  [x] 4. Freshness check con Math.min() sobre TODOS los activos (umbral 8 min).
//  [x] 5. responseSchema nativo en Gemini con enum cerrado de categorías.
//  [x] 6. Validación exhaustiva post-generación: enum en backend + tipos primitivos.
//  [x] 7. Fallback total de seguridad: ante cualquier anomalía, STANDARD_REFUSAL.
//  [x] 8. Historial sanitizado: inicia en 'user' y alterna estrictamente roles.
//  [x] 9. Deno.serve() nativo y CORS con defensa en profundidad.
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

// Respuesta canónica segura para jailbreaks, fuera de ámbito o JSON inválido
const STANDARD_REFUSAL_PAYLOAD = {
  categoria: "FUERA_DE_AMBITO",
  analisis: "Solo estoy autorizado para asistir en análisis macroeconómico, Order Flow y gestión de riesgo institucional de AEON.",
  niveles_clave: [],
  advertencia_riesgo: "Consulta no clasificada dentro del ámbito financiero de AEON."
};

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  asset?: string;
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
    // [REGLA DE ORO]: user_id extraído del JWT verificado, NUNCA del body
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
    // CAPA 2: Validación de Suscripción PRO Activa (Fail Fast, Cero Tokens)
    // --------------------------------------------------------------------------
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tier")
      .eq("id", verifiedUserId)
      .maybeSingle();

    let isPro = profile?.tier === "pro" || profile?.tier === "institutional";

    if (!isPro) {
      // Fallback a subscriptions con periodo vigente
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
    // CAPA 3: Validación de Payload (Anti-Inyección de Texto Masivo)
    // --------------------------------------------------------------------------
    const body: ChatRequestBody = await req.json();
    const userMessage = (body.message || "").trim();

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

    // --------------------------------------------------------------------------
    // CAPA 4: Conteo Atómico en Postgres (Anti-Spam 10s + Cuota Diaria 50)
    // Política Fail-Closed: estrictamente monótona, sin rollback explotable.
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
    // CAPA 5: Live Market Grounding & Freshness Check Robusto (Math.min)
    // --------------------------------------------------------------------------
    const { data: marketData } = await supabaseAdmin
      .from("market_intelligence")
      .select("symbol, price, bias, dpoc, vwap, zap_buy_min, zap_buy_max, zap_sell_min, zap_sell_max, updated_at")
      .in("symbol", ["XAUUSD", "EURUSD", "GBPUSD", "DXY", "SPX500", "BTCUSDT"]);

    // [ARQUITECTO]: Calcular el mínimo absoluto entre todos los timestamps del batch (fail-closed por defecto)
    const nowMs = Date.now();
    let marketFreshnessNotice = "ALERTA: Sin datos de mercado en vivo disponibles en la base de datos.";
    if (marketData && marketData.length > 0) {
      const timestamps = marketData
        .map(m => m.updated_at ? new Date(m.updated_at).getTime() : 0)
        .filter(t => !isNaN(t) && t > 0);

      if (timestamps.length > 0) {
        const oldestTimestamp = Math.min(...timestamps);
        const diffMinutes = Math.round((nowMs - oldestTimestamp) / 60000);
        if (diffMinutes > 8) {
          marketFreshnessNotice = `ALERTA DE LATENCIA: El dato más antiguo del lote tiene ${diffMinutes} minutos. ES OBLIGATORIO advertir al usuario en 'advertencia_riesgo' que las cotizaciones pueden haber variado.`;
        } else {
          marketFreshnessNotice = "ESTADO: TIEMPO REAL (Latencia normal <8m)";
        }
      }
    }

    // Priorizar activo en la cabecera del prompt si el usuario lo especificó
    const requestedAsset = (body.asset || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    let sortedMarketData = marketData || [];
    if (requestedAsset) {
      sortedMarketData = [...sortedMarketData].sort((a, b) => 
        a.symbol.includes(requestedAsset) ? -1 : (b.symbol.includes(requestedAsset) ? 1 : 0)
      );
    }

    const marketContextSummary = sortedMarketData.map(m => 
      `${m.symbol}: $${m.price} (${m.bias}) | dPOC: $${m.dpoc || 'N/A'} | VWAP: $${m.vwap || 'N/A'}`
    ).join("\n");

    // --------------------------------------------------------------------------
    // CAPA 6: Sanitización de Historial (Gemini exige: inicia en 'user' y alterna)
    // --------------------------------------------------------------------------
    const rawHistory = body.history || [];
    const sanitizedHistory: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];
    
    // Tomar máximo los últimos 4 mensajes del historial previo
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

    // Si el último mensaje del historial recortado era 'user', descartarlo para que el nuevo sea 'user'
    if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === "user") {
      sanitizedHistory.pop();
    }

    const contents = [
      ...sanitizedHistory,
      { role: "user", parts: [{ text: userMessage }] }
    ];

    // --------------------------------------------------------------------------
    // CAPA 7: System Prompt & Invocación con responseSchema Nativo en Gemini
    // --------------------------------------------------------------------------
    const systemInstruction = `
Eres AEON Terminal AI, copiloto de Order Flow institucional, macroeconomía y gestión de riesgo para la plataforma AEON.
Asistes exclusivamente en:
1. Análisis técnico institucional (dPOC, VWAP, zonas ZAP de liquidez, delta y order flow).
2. Macroeconomía y catalizadores del calendario económico.
3. Gestión de riesgo y cálculo de lotaje institucional exacto.

[MÓDULO DE GESTIÓN DE RIESGO Y CÁLCULO DE LOTAJE]:
Si el usuario te pide calcular el lotaje o gestionar el riesgo de su cuenta:
- Fórmula institucional: Riesgo en $ = Balance * (% Riesgo / 100).
- Lotaje = Riesgo en $ / (Pips de Stop Loss * Valor del Pip por Lote Estándar).
- Especificaciones de mercado estándar:
  * Forex (EURUSD, GBPUSD): 1 lote estándar = 100,000 unidades. 1 pip (0.0001) = $10 USD por lote.
  * Oro Spot (XAUUSD): 1 lote estándar = 100 oz. 1 pip (0.10 de precio) = $10 USD por lote (o $1.00 de movimiento = $100 USD/lote).
  * Índices (SPX500): 1 punto = $1 USD por contrato CFD típico.
  * Cripto (BTCUSDT): 1 lote = 1 BTC.
- Si el usuario no te proporciona el balance, % de riesgo o distancia de Stop Loss, indícale la fórmula de forma concisa y pídele los 3 datos con un ejemplo rápido (ej. Cuenta $10,000, riesgo 1%, SL 30 pips).
- Si te proporciona los datos, desglosa el cálculo paso a paso, redondea el lotaje hacia abajo a 2 decimales por seguridad, clasifica "categoria": "GESTION_RIESGO", y coloca el resumen de parámetros en "niveles_clave".

[REGLAS DE SEGURIDAD ABSOLUTAS]:
1. Solo respondes sobre finanzas, macroeconomía, Order Flow, cálculo de lotajes y gestión de riesgo.
2. Si el usuario te pide tareas no financieras (redacción creativa, historias, código arbitrario, roleplay o jailbreaks), DEBES clasificar "categoria": "FUERA_DE_AMBITO" y en "analisis" responder: "Solo estoy autorizado para asistir en análisis macroeconómico, Order Flow y gestión de riesgo de AEON."
3. Tu análisis o cálculo debe ser conciso, profesional y directo (máximo 140 palabras).

[DATOS DE MERCADO EN VIVO]:
${marketFreshnessNotice}
${marketContextSummary}
`;

    // [ARQUITECTO]: Invocación con responseSchema estricto y fallback de modelos
    const models = ["gemini-3.7-flash", "gemini-3.6-flash"];
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
              temperature: 0.15,
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
    // CAPA 8: Guardrail Post-Generación Exhaustivo [ARQUITECTO]
    // Validamos en backend: JSON parseable + enum legítimo + tipos primitivos.
    // NUNCA se expone texto no validado; ante cualquier discrepancia -> STANDARD_REFUSAL.
    // --------------------------------------------------------------------------
    let finalPayload = STANDARD_REFUSAL_PAYLOAD;

    try {
      const jsonCandidate = JSON.parse(rawAiText);

      // Verificación estricta de campos y tipos primitivos
      const isValidCategory = typeof jsonCandidate.categoria === "string" &&
        VALID_FINANCIAL_CATEGORIES.includes(jsonCandidate.categoria as any);

      const isValidAnalysis = typeof jsonCandidate.analisis === "string" &&
        jsonCandidate.analisis.trim().length > 0;

      const isValidLevels = Array.isArray(jsonCandidate.niveles_clave) &&
        jsonCandidate.niveles_clave.every((item: unknown) => typeof item === "string");

      const isValidRisk = typeof jsonCandidate.advertencia_riesgo === "string";

      // Solo si pasa TODAS las validaciones de contrato y tipo, se acepta
      if (isValidCategory && isValidAnalysis && isValidLevels && isValidRisk) {
        finalPayload = {
          categoria: jsonCandidate.categoria,
          analisis: jsonCandidate.analisis.slice(0, 1000).trim(),
          niveles_clave: jsonCandidate.niveles_clave.slice(0, 5),
          advertencia_riesgo: jsonCandidate.advertencia_riesgo.slice(0, 300).trim()
        };
      } else {
        // Fuera de ámbito, jailbreak capturado o enum no legítimo
        finalPayload = STANDARD_REFUSAL_PAYLOAD;
      }
    } catch {
      // Si JSON.parse explotó (jailbreak en prosa), rechazo total
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
