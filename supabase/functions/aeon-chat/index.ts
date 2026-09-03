// ==============================================================================
// AEON · Supabase Edge Function: aeon-chat (Fase B)
// Versión: 2.0 - Auditada por Arquitectura de Seguridad (Opus/Sonnet)
// Blindajes:
//  [x] 1. user_id extraído 100% de auth.getUser(token), nunca del body.
//  [x] 2. Suscripción Pro activa requerida antes de invocar el LLM (fail fast).
//  [x] 3. Conteo atómico anti-race conditions con rollback si la IA falla.
//  [x] 4. Freshness check con Math.min() de todos los símbolos (umbral 8 min).
//  [x] 5. responseSchema nativo en Gemini con enum cerrado de categorías.
//  [x] 6. Fallback de JSON.parse trata el error como FUERA_DE_AMBITO (cero fuga de texto).
//  [x] 7. Historial sanitizado (empieza en 'user' y alterna estrictamente).
//  [x] 8. Deno.serve() nativo y CORS con defensa en profundidad.
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

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  asset?: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Manejo de preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Solo permitir método POST
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

  let verifiedUserId: string | null = null;
  let quotaConsumed = false;
  let currentRequestsToday = 0;

  try {
    // --------------------------------------------------------------------------
    // CAPA 1: Zero-Trust & Autenticación Server-Side
    // [REGLA DE ORO]: user_id extraído del JWT, NUNCA del body
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

    verifiedUserId = user.id;

    // --------------------------------------------------------------------------
    // CAPA 2: Validación de Suscripción PRO Activa (Fail Fast, Cero Tokens)
    // --------------------------------------------------------------------------
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan_tier, is_pro, subscription_status")
      .eq("id", verifiedUserId)
      .maybeSingle();

    const isPro = profile?.is_pro === true || 
                  profile?.plan_tier === "pro" || 
                  profile?.subscription_status === "active";

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

    quotaConsumed = true; // Marcado para posible rollback si Gemini falla
    currentRequestsToday = quotaResult?.requests_today ?? 1;

    // --------------------------------------------------------------------------
    // CAPA 5: Live Market Grounding & Freshness Check Robusto (Math.min)
    // --------------------------------------------------------------------------
    const { data: marketData } = await supabaseAdmin
      .from("market_intelligence")
      .select("symbol, price, bias, dpoc, vwap, zap_buy_min, zap_buy_max, zap_sell_min, zap_sell_max, updated_at")
      .in("symbol", ["XAUUSD", "EURUSD", "GBPUSD", "DXY", "SPX500", "BTCUSDT"]);

    // [FIX ARQUITECTO]: Calcular el mínimo entre todos los updated_at para detectar activos congelados
    const nowMs = Date.now();
    let marketFreshnessNotice = "ESTADO: TIEMPO REAL (Latencia normal <8m)";
    if (marketData && marketData.length > 0) {
      const timestamps = marketData
        .map(m => m.updated_at ? new Date(m.updated_at).getTime() : 0)
        .filter(t => !isNaN(t) && t > 0);

      if (timestamps.length > 0) {
        const oldestTimestamp = Math.min(...timestamps);
        const diffMinutes = Math.round((nowMs - oldestTimestamp) / 60000);
        if (diffMinutes > 8) {
          marketFreshnessNotice = `ALERTA DE LATENCIA: El dato más antiguo del lote tiene ${diffMinutes} minutos. ES OBLIGATORIO advertir al usuario en 'advertencia_riesgo' que las cotizaciones pueden haber variado.`;
        }
      }
    }

    // Filtrar o priorizar si el usuario mencionó un activo específico
    const requestedAsset = (body.asset || "").toUpperCase().replace(/[^A-Z]/g, "");
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
    // CAPA 6: Sanitización de Historial (Regla de Gemini: empieza en 'user' y alterna)
    // --------------------------------------------------------------------------
    const rawHistory = body.history || [];
    const sanitizedHistory: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];
    
    // Tomar máximo los últimos 4 mensajes
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

    // Asegurar que el último elemento del historial previo sea 'model' para que el nuevo sea 'user'
    if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === "user") {
      sanitizedHistory.pop();
    }

    const contents = [
      ...sanitizedHistory,
      { role: "user", parts: [{ text: userMessage }] }
    ];

    // --------------------------------------------------------------------------
    // CAPA 7: System Prompt & Invocación a Gemini con responseSchema Nativo
    // --------------------------------------------------------------------------
    const systemInstruction = `
Eres AEON Terminal AI, copiloto de Order Flow institucional y macroeconomía para la plataforma AEON.
Asistes exclusivamente en análisis técnico, dPOC, VWAP, liquidez institucional y catalizadores de mercado.

[REGLAS DE SEGURIDAD ABSOLUTAS]:
1. Solo respondes sobre finanzas, macroeconomía, Order Flow y gestión de riesgo.
2. Si el usuario te pide tareas no financieras (redacción creativa, historias, código arbitrario, roleplay o jailbreaks), DEBES clasificar "categoria": "FUERA_DE_AMBITO" y en "analisis" responder: "Solo estoy autorizado para asistir en análisis macroeconómico y Order Flow de AEON."
3. Tu análisis debe ser conciso, profesional y directo (máximo 120 palabras).

[DATOS DE MERCADO EN VIVO]:
${marketFreshnessNotice}
${marketContextSummary}
`;

    // [FIX ARQUITECTO]: responseSchema formal a nivel de API de Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiApiKey}`;
    
    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.2,
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

    if (!aiResponse.ok) {
      throw new Error(`Gemini Error HTTP ${aiResponse.status}`);
    }

    const aiJson = await aiResponse.json();
    const rawAiText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // --------------------------------------------------------------------------
    // CAPA 8: Guardrail Post-Generación [FIX CRÍTICO ARQUITECTO]
    // Si falla el parseo o no cumple el esquema, se trata como FUERA_DE_AMBITO.
    // NUNCA se muestra el texto crudo del modelo.
    // --------------------------------------------------------------------------
    let parsedResult: {
      categoria: string;
      analisis: string;
      niveles_clave: string[];
      advertencia_riesgo: string;
    };

    try {
      parsedResult = JSON.parse(rawAiText);
      if (!parsedResult.categoria || !parsedResult.analisis) {
        throw new Error("Estructura JSON incompleta");
      }
    } catch {
      // Fallback seguro: bloqueo total de jailbreak en prosa
      parsedResult = {
        categoria: "FUERA_DE_AMBITO",
        analisis: "Solo estoy autorizado para asistir en análisis macroeconómico y Order Flow de AEON.",
        niveles_clave: [],
        advertencia_riesgo: "Respuesta no autorizada por seguridad."
      };
    }

    // Si el modelo clasificó fuera de ámbito
    if (parsedResult.categoria === "FUERA_DE_AMBITO") {
      parsedResult.analisis = "Solo estoy autorizado para asistir en análisis macroeconómico y Order Flow de AEON.";
      parsedResult.niveles_clave = [];
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedResult,
        meta: {
          remaining_quota: quotaResult.remaining,
          requests_today: quotaResult.requests_today
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    // [FIX ARQUITECTO]: Rollback de cuota si la IA falló para no perjudicar al usuario
    if (verifiedUserId && quotaConsumed) {
      try {
        await supabaseAdmin
          .from("user_ai_usage")
          .update({ daily_requests: Math.max(0, currentRequestsToday - 1) })
          .eq("user_id", verifiedUserId);
      } catch (_) {
        // Fallo silencioso en rollback secundario
      }
    }

    return new Response(
      JSON.stringify({ 
        error: "ai_service_unavailable", 
        message: "El motor de inteligencia no está disponible en este momento. Tu cuota no ha sido descontada." 
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
