// ==============================================================================
// AEON · Supabase Edge Function: aeon-copilot-event (MAS Orchestrator v1.1.0)
// ==============================================================================
// Arquitectura Cuantitativa & Contextual Soberana:
// 1. Paso 0: Validación estricta de Contrato schema_version: "1.0.0".
// 2. Paso 1: Circuit Breaker Macro Blackout (Pre-LLM, $0 tokens).
// 3. Paso 2: Desacoplamiento de Capas:
//    - Capa Estructural (Gate de Emisión): Magnitud intrínseca del evento (ZAP, barrido BSL/SSL, dPOC).
//    - Capa Macro & Sesión: Insumo narrativo para Agente 2, enriqueciendo el contexto sin censurar el evento.
// 4. Paso 3: Guardrails Deterministas Anti-Oráculo:
//    - Enum cerrado en responseSchema (event_type).
//    - Nivel de invalidación técnica precalculado deterministamente con spread buffer real.
//    - Inyección de calendar_status determinista ("past" / "upcoming").
//    - Filtro regex denylist post-generación contra verbos imperativos ("compra/vende").
// 5. Paso 4: Disparo en Paralelo Real (Promise.allSettled) con Timeout de 3.5s.
// 6. Paso 5: Persistencia y Broadcast condicional como Alerta Estructural de Contexto.
// ==============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Regex Denylist Anti-Oráculo determinista post-generación
const ORACLE_DENYLIST_REGEX = /\b(compra|compre|compren|comprar|comprando|compramos|vende|venda|venden|vender|vendiendo|vendemos|aprovecha|aprovechen|aprovechar|entra|entren|entrar|entrando|dispara|disparen|disparar|ejecuta|ejecuten|ejecutar|metele|haz long|haz short|tomar posicion|toma posicion)\b/i;

// ------------------------------------------------------------------------------
// Tipos de Contrato Versionado v1.0.0
// ------------------------------------------------------------------------------
interface DeterministicInputs {
  zap_price_range: [number, number];
  dpoc: number;
  vwap: number;
  current_price: number;
  liquidity_state: {
    bsl_swept: boolean;
    ssl_status: "swept" | "pending" | "untouched" | string;
    active_cluster?: string;
  };
  macro_driver: string;
  dxy_trend?: "bullish" | "bearish" | "neutral" | string;
  us10y_trend?: "bullish" | "bearish" | "neutral" | string;
  ema50_slope?: "alcista" | "bajista" | "plano" | string;
  daily_briefing_bias?: "bullish" | "bearish" | "neutral" | string;
}

interface MASContractV1 {
  schema_version: string;
  event_id: string;
  asset: string;
  symbol?: string;
  session?: string;
  timestamp?: string;
  trigger_source?: string;
  trigger_type?: string;
  current_price: number;
  display_name?: string;
  shadow_mode?: boolean;
  deterministic_inputs: DeterministicInputs;
  market_data?: any;
}

interface Agent1Output {
  event_type?: string;
  bias: "compra" | "venta" | "neutral";
  hypothesis: string;
  structural_invalidation_price: number;
  latency_ms: number;
}

interface Agent2Output {
  macro_blackout: boolean;
  cross_asset_confirmation: "confirmado" | "contradicho" | "neutral";
  session_liquidity_bias: string;
  macro_driver_context?: string;
  confluence_score: number;
  score_label: "A+" | "B" | "VETO";
  veto_reason: string | null;
  latency_ms: number;
}

// ------------------------------------------------------------------------------
// Helpers Deterministas y Fallbacks Blindados ($0 tokens)
// ------------------------------------------------------------------------------

/**
 * Calcula de forma determinista el nivel de invalidación técnica estructural
 * aplicando el buffer de spread institucional real según el activo.
 */
function calculateStructuralInvalidation(
  poiRange: [number, number],
  setupType: string,
  currentPrice: number,
  asset: string
): number {
  const isGold = asset.includes("XAU");
  const isJpy = asset.includes("JPY");
  const spreadBuffer = isGold ? 0.50 : (isJpy ? 0.03 : 0.00030);

  if (setupType === "ZAP_SUPPLY_SWEEP") {
    const high = (poiRange && poiRange[1]) ? poiRange[1] : currentPrice;
    return Number((high + spreadBuffer).toFixed(isGold ? 2 : 5));
  } else {
    const low = (poiRange && poiRange[0]) ? poiRange[0] : currentPrice;
    return Number((low - spreadBuffer).toFixed(isGold ? 2 : 5));
  }
}

/**
 * Heurística determinista pura ($0 tokens) para Agente 1 en caso de fallback o denylist.
 * Describe objetivamente la microestructura sin verbos imperativos.
 */
function deterministicBiasFallback(
  poiRange: [number, number],
  setupType: string,
  liquidityState: { bsl_swept: boolean; ssl_status: string },
  currentPrice: number,
  asset: string
): { event_type: string; bias: "compra" | "venta" | "neutral"; hypothesis: string; structuralInvalidation: number } {
  try {
    const bslSwept = Boolean(liquidityState?.bsl_swept);
    const sslSwept = liquidityState?.ssl_status === "swept";
    const invalidation = calculateStructuralInvalidation(poiRange, setupType, currentPrice, asset);

    if (setupType === "ZAP_SUPPLY_SWEEP" && bslSwept) {
      return {
        event_type: "BARRIDO_LIQUIDEZ_BSL",
        bias: "venta",
        hypothesis: `Rechazo institucional en ZAP de Oferta tras absorción de liquidez compradora (BSL). Invalidación estructural en $${invalidation}.`,
        structuralInvalidation: invalidation
      };
    } else if (setupType === "ZAP_DEMAND_SWEEP" && sslSwept) {
      return {
        event_type: "BARRIDO_LIQUIDEZ_SSL",
        bias: "compra",
        hypothesis: `Absorción institucional en ZAP de Demanda tras barrido de liquidez vendedora (SSL). Invalidación estructural en $${invalidation}.`,
        structuralInvalidation: invalidation
      };
    } else {
      return {
        event_type: "CONSOLIDACION_RANGO",
        bias: "neutral",
        hypothesis: `Estructura en rango de consolidación sin barrido institucional confirmado. Cotización actual $${currentPrice}.`,
        structuralInvalidation: invalidation
      };
    }
  } catch (_) {
    return {
      event_type: "CONSOLIDACION_RANGO",
      bias: "neutral",
      hypothesis: `Lectura de microestructura degradada por datos atípicos en $${currentPrice}.`,
      structuralInvalidation: currentPrice
    };
  }
}

/**
 * Fallback determinista para el Régimen de Sesión (Agente 2)
 */
function deterministicSessionBiasFallback(
  ema50Slope: string = "plano",
  dailyBriefingBias: string = "neutral"
): "alineado" | "neutral" | "contratendencia" {
  const slope = (ema50Slope || "plano").toLowerCase();
  const briefing = (dailyBriefingBias || "neutral").toLowerCase();

  if (slope === "plano" || briefing === "neutral") {
    return "neutral";
  }
  const isSlopeBull = slope.includes("alc") || slope.includes("bull");
  const isBriefBull = briefing.includes("alc") || briefing.includes("bull");
  const isSlopeBear = slope.includes("baj") || slope.includes("bear");
  const isBriefBear = briefing.includes("baj") || briefing.includes("bear");

  if ((isSlopeBull && isBriefBull) || (isSlopeBear && isBriefBear)) {
    return "alineado";
  }
  return "contratendencia";
}

// ------------------------------------------------------------------------------
// Matriz Cuantitativa Desacoplada: Magnitud Estructural Intrínseca + Insumo Macro
// ------------------------------------------------------------------------------
function calculateDeterministicConfluence(
  inputs: DeterministicInputs,
  setupType: string,
  asset: string,
  minsToNextTier1: number | null
): {
  confluenceScore: number;
  scoreLabel: "A+" | "B" | "VETO";
  crossAssetStatus: "confirmado" | "contradicho" | "neutral";
  sessionBiasLabel: string;
  isStructuralEventSignificant: boolean;
  microScore: number;
} {
  const price = inputs.current_price;
  const zapLow = inputs.zap_price_range?.[0] ?? price;
  const zapHigh = inputs.zap_price_range?.[1] ?? price;
  const dpoc = inputs.dpoc ?? price;
  const isSell = setupType === "ZAP_SUPPLY_SWEEP";
  const isBuy = setupType === "ZAP_DEMAND_SWEEP";

  // 1. Capa Estructural Intrínseca (40 pts)
  let microScore = 0;
  // Precio dentro de ZAP (+15)
  if (price >= zapLow && price <= zapHigh) {
    microScore += 15;
  }
  // Barrido confirmado (+15)
  if (isSell && inputs.liquidity_state?.bsl_swept) {
    microScore += 15;
  } else if (isBuy && inputs.liquidity_state?.ssl_status === "swept") {
    microScore += 15;
  }
  // Desequilibrio vs dPOC (+10)
  if (Math.abs(price - dpoc) > 0) {
    microScore += 10;
  }

  // Gate de significancia estructural intrínseca:
  // Al menos 25 pts en microestructura (barrido + ZAP o barrido + dPOC)
  const isStructuralEventSignificant = microScore >= 25;

  // 2. Insumo Narrativo & Confirmación Cruzada DXY/Yields (25 pts con -15 penalización)
  let crossScore = 0;
  let crossAssetStatus: "confirmado" | "contradicho" | "neutral" = "neutral";
  const dxy = (inputs.dxy_trend || "neutral").toLowerCase();

  if (isBuy) {
    if (dxy === "bearish") {
      crossScore = 25;
      crossAssetStatus = "confirmado";
    } else if (dxy === "bullish") {
      crossScore = -15;
      crossAssetStatus = "contradicho";
    } else {
      crossScore = 10;
      crossAssetStatus = "neutral";
    }
  } else if (isSell) {
    if (dxy === "bullish") {
      crossScore = 25;
      crossAssetStatus = "confirmado";
    } else if (dxy === "bearish") {
      crossScore = -15;
      crossAssetStatus = "contradicho";
    } else {
      crossScore = 10;
      crossAssetStatus = "neutral";
    }
  } else {
    crossScore = 10;
  }

  // 3. Régimen de Sesión (20 pts)
  let sessionScore = 0;
  const sessionBias = deterministicSessionBiasFallback(
    inputs.ema50_slope,
    inputs.daily_briefing_bias
  );
  if (sessionBias === "alineado") {
    sessionScore = 20;
  } else if (sessionBias === "neutral") {
    sessionScore = 10;
  } else {
    sessionScore = 0;
  }
  const sessionBiasLabel = `Régimen ${sessionBias.toUpperCase()} con Daily Briefing y EMA50`;

  // 4. Ventana Macro (15 pts)
  let macroScore = 15;
  if (minsToNextTier1 !== null) {
    if (minsToNextTier1 <= 15 && minsToNextTier1 >= -15) {
      macroScore = 0; // Blackout
    } else if (minsToNextTier1 <= 30 && minsToNextTier1 > 15) {
      macroScore = 0;
    } else if (minsToNextTier1 <= 60 && minsToNextTier1 > 30) {
      macroScore = 5;
    } else {
      macroScore = 15;
    }
  }

  // Clamping Rule: max(0, total)
  const rawTotal = microScore + crossScore + sessionScore + macroScore;
  const confluenceScore = Math.max(0, rawTotal);

  let scoreLabel: "A+" | "B" | "VETO" = "VETO";
  if (confluenceScore >= 80) {
    scoreLabel = "A+";
  } else if (confluenceScore >= 60) {
    scoreLabel = "B";
  } else {
    scoreLabel = "VETO";
  }

  return {
    confluenceScore,
    scoreLabel,
    crossAssetStatus,
    sessionBiasLabel,
    isStructuralEventSignificant,
    microScore
  };
}

// ------------------------------------------------------------------------------
// Invocación a Gemini 2.5 Flash-Lite con Guardrails Anti-Oráculo
// ------------------------------------------------------------------------------
async function callAgent1_TacticalHypothesis(
  payload: MASContractV1,
  precalculatedInvalidation: number,
  apiKey: string
): Promise<{ event_type: string; bias: "compra" | "venta" | "neutral"; hypothesis: string; structuralInvalidation: number }> {
  const inputs = payload.deterministic_inputs;
  const setupType = payload.trigger_type || "ZAP_POI_CONFLUENCE";
  const name = payload.display_name || payload.asset;

  const systemInstruction = `Eres AEON Tactical Agent (Agente 1), analista cuantitativo institucional de Order Flow y microestructura de mercado.
Tu única función es describir el evento estructural en EXACTAMENTE 2 FRASES breves (máximo 45 palabras en total).
- Frase 1: Describe la acción del precio en ${name} ($${payload.current_price}), la zona ZAP testeada y el estado del barrido de liquidez.
- Frase 2: Conecta con el dPOC diario ($${inputs.dpoc}) y referencia el nivel de invalidación técnica precalculado ($${precalculatedInvalidation}).

REGLAS CARDINALES ANTI-ORÁCULO DETERMINISTAS:
1. PROHIBIDO recomendar comprar, vender, entrar o sugerir operaciones de mercado. Eres un descriptor neutral de microestructura, no un asesor de trading.
2. NUNCA uses verbos imperativos como: "compra", "vende", "aprovecha", "entra", "ejecuta", "dispara".
3. CONTRAEJEMPLO PROHIBIDO: "Compra oro en 4300 aprovechando el rebote en ZAP hacia el target."
4. CONTRAEJEMPLO PERMITIDO: "XAUUSD ($${payload.current_price}) barrió mínimos asiáticos reaccionando con absorción sobre el soporte ZAP. Cotiza bajo el dPOC ($${inputs.dpoc}); invalidación técnica óptima en $${precalculatedInvalidation}."
5. Cero saludos o cortesías. Tono quirúrgico e institucional.`;

  const userPrompt = `DATOS CUANTITATIVOS:
Activo: ${name} | Precio: ${payload.current_price} | Setup: ${setupType}
ZAP Rango: [${inputs.zap_price_range?.[0]} - ${inputs.zap_price_range?.[1]}]
dPOC: ${inputs.dpoc} | VWAP: ${inputs.vwap}
Liquidez: BSL Swept = ${inputs.liquidity_state?.bsl_swept} | SSL = ${inputs.liquidity_state?.ssl_status}
Invalidación Técnica Precalculada: ${precalculatedInvalidation}
Catalizador: ${inputs.macro_driver}`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 150,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          event_type: {
            type: "STRING",
            enum: [
              "BARRIDO_LIQUIDEZ_SSL",
              "BARRIDO_LIQUIDEZ_BSL",
              "TEST_ZAP_DEMANDA",
              "TEST_ZAP_OFERTA",
              "ABSORCION_DPOC",
              "CONSOLIDACION_RANGO"
            ]
          },
          bias: { type: "STRING", enum: ["compra", "venta", "neutral"] },
          hypothesis: { type: "STRING" }
        },
        required: ["event_type", "bias", "hypothesis"]
      }
    }
  };

  const res = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(3500),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Gemini Agent 1 failed with status ${res.status}`);
  }

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty candidate response");

  const parsed = JSON.parse(rawText);
  return {
    event_type: parsed.event_type || (setupType === "ZAP_SUPPLY_SWEEP" ? "BARRIDO_LIQUIDEZ_BSL" : "BARRIDO_LIQUIDEZ_SSL"),
    bias: parsed.bias || "neutral",
    hypothesis: parsed.hypothesis || "",
    structuralInvalidation: precalculatedInvalidation
  };
}

async function callAgent2_MacroRiskContext(
  payload: MASContractV1,
  calendarStatus: string,
  apiKey: string
): Promise<{ session_liquidity_bias: string; macro_driver_context: string }> {
  const inputs = payload.deterministic_inputs;
  const name = payload.display_name || payload.asset;

  const systemInstruction = `Eres AEON Macro Guardian (Agente 2), auditor de riesgo macro y régimen de liquidez intermercado.
Tu función es describir objetivamente el entorno macroeconómico en máximo 2 frases breves (30 palabras).
- Frase 1: Régimen de sesión y alineación con DXY (${inputs.dxy_trend || "neutral"}) y US10Y (${inputs.us10y_trend || "neutral"}).
- Frase 2: Contexto del catalizador de calendario económico (${calendarStatus}).

REGLAS DE RIGOR TEMPORAL Y ANTI-ORÁCULO:
1. Si calendar_status indica 'past', el dato YA ocurrió y fue asimilado por el mercado. PROHIBIDO tratarlo como evento futuro o sugerir 'esperar a la noticia'.
2. PROHIBIDO aconsejar comprar, vender o entrar. Solo describe el contexto macroeconómico.`;

  const userPrompt = `Activo: ${name} | Sesión: ${payload.session || "GLOBAL"}
DXY Trend: ${inputs.dxy_trend || "neutral"} | US10Y Trend: ${inputs.us10y_trend || "neutral"}
EMA50 Slope: ${inputs.ema50_slope || "plano"} | Daily Bias: ${inputs.daily_briefing_bias || "neutral"}
Estado Calendario: ${calendarStatus} | Driver: ${inputs.macro_driver}`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 100,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          session_liquidity_bias: { type: "STRING" },
          macro_driver_context: { type: "STRING" }
        },
        required: ["session_liquidity_bias", "macro_driver_context"]
      }
    }
  };

  const res = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(3500),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Gemini Agent 2 failed with status ${res.status}`);
  }

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty candidate response");

  const parsed = JSON.parse(rawText);
  return {
    session_liquidity_bias: parsed.session_liquidity_bias || "Régimen institucional estándar",
    macro_driver_context: parsed.macro_driver_context || "Contexto macroeconómico neutral."
  };
}

// ------------------------------------------------------------------------------
// Despacho de Realtime Broadcast
// ------------------------------------------------------------------------------
async function broadcastAlert(supabaseAdmin: any, alertPayload: any): Promise<void> {
  return new Promise((resolve) => {
    try {
      const channel = supabaseAdmin.channel("aeon_harness_alerts");
      const timeoutId = setTimeout(() => {
        try { supabaseAdmin.removeChannel(channel); } catch (_) {}
        resolve();
      }, 1500);

      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "tactical_alert",
            payload: alertPayload
          }).then(() => {
            clearTimeout(timeoutId);
            try { supabaseAdmin.removeChannel(channel); } catch (_) {}
            resolve();
          }).catch(() => {
            clearTimeout(timeoutId);
            try { supabaseAdmin.removeChannel(channel); } catch (_) {}
            resolve();
          });
        }
      });
    } catch (_) {
      resolve();
    }
  });
}

// ------------------------------------------------------------------------------
// Servidor Principal Deno (Orquestador MAS)
// ------------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const aiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

  // 1. Seguridad Zero-Trust: Acceso EXCLUSIVO a service_role (Blindaje total anti-spoofing)
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const isAuthorized = Boolean(token && serviceRoleKey && token === serviceRoleKey);
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "unauthorized", message: "Acceso denegado. Requiere service_role key del motor VPS." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let rawBody: any;
  try {
    rawBody = await req.json();
  } catch (_) {
    return new Response(
      JSON.stringify({ error: "invalid_json", message: "Cuerpo de solicitud no es JSON válido." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ----------------------------------------------------------------------------
  // Paso 0: Validación Estricta de Contrato Versionado (schema_version: "1.0.0")
  // ----------------------------------------------------------------------------
  if (
    rawBody.schema_version !== "1.0.0" ||
    !rawBody.event_id ||
    (!rawBody.asset && !rawBody.symbol) ||
    typeof rawBody.current_price !== "number" ||
    !rawBody.deterministic_inputs ||
    !Array.isArray(rawBody.deterministic_inputs.zap_price_range)
  ) {
    return new Response(
      JSON.stringify({
        error: "invalid_contract_v1",
        message: "El payload no cumple con el contrato estricto schema_version 1.0.0."
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payload: MASContractV1 = rawBody;
  const asset = payload.asset || payload.symbol || "XAUUSD";
  const setupType = payload.trigger_type || "ZAP_POI_CONFLUENCE";
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Control de Idempotencia por event_id
  const { data: existing } = await supabaseAdmin
    .from("trading_signal_events")
    .select("id, event_id, status, llm_verdict, confluence_score, score_label, broadcast_decision")
    .eq("event_id", payload.event_id)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({
        status: "duplicate",
        message: "Evento ya registrado previamente.",
        event_id: existing.event_id,
        score_label: existing.score_label,
        broadcast_decision: existing.broadcast_decision
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ----------------------------------------------------------------------------
  // Paso 1: Circuit Breaker Macro Blackout (Pre-LLM, Costo $0)
  // ----------------------------------------------------------------------------
  let minsToNextTier1: number | null = null;
  let isMacroBlackout = false;
  let vetoReason: string | null = null;

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const { data: calEvents } = await supabaseAdmin
      .from("economic_calendar")
      .select("id, title, impact, event_time")
      .gte("event_time", windowStart)
      .lte("event_time", windowEnd)
      .limit(5);

    if (calEvents && calEvents.length > 0) {
      // Filtrar eventos Tier-1 de alto impacto
      const tier1 = calEvents.find((e: any) => {
        const imp = (e.impact || "").toUpperCase();
        const t = (e.title || "").toUpperCase();
        return (
          imp === "HIGH" ||
          imp === "TIER-1" ||
          t.includes("CPI") ||
          t.includes("NFP") ||
          t.includes("FOMC") ||
          t.includes("FED") ||
          t.includes("RATE")
        );
      });

      if (tier1) {
        const evTime = new Date(tier1.event_time).getTime();
        minsToNextTier1 = Math.round((evTime - now.getTime()) / 60000);
        // Si está en la ventana crítica de [-15 min, +30 min]
        if (minsToNextTier1 >= -15 && minsToNextTier1 <= 30) {
          isMacroBlackout = true;
          vetoReason = `Blackout Tier-1 activo: ${tier1.title} (${minsToNextTier1}m de diferencia). Operativa suspendida por riesgo de cola.`;
        }
      }
    }
  } catch (_) {
    // Si falla la consulta a calendario, se continúa con margen defensivo
  }

  // Si hay Blackout Macro Tier-1: VETO inmediato sin tocar Gemini ($0 tokens, 0ms)
  if (isMacroBlackout) {
    const agent2Veto: Agent2Output = {
      macro_blackout: true,
      cross_asset_confirmation: "contradicho",
      session_liquidity_bias: "Blackout Macro Tier-1",
      confluence_score: 0,
      score_label: "VETO",
      veto_reason: vetoReason,
      latency_ms: Date.now() - startTime
    };

    // Persistencia silenciosa en trading_signal_events
    await supabaseAdmin.from("trading_signal_events").insert({
      event_id: payload.event_id,
      symbol: asset,
      display_name: payload.display_name || asset,
      trigger_type: setupType,
      current_price: payload.current_price,
      market_data: payload.market_data || {},
      llm_verdict: `VETO MACRO: ${vetoReason}`,
      status: "invalidated",
      schema_version: "1.0.0",
      confluence_score: 0,
      score_label: "VETO",
      broadcast_decision: "discard",
      agent_2_output: agent2Veto,
      fallback_mode: false,
      shadow_mode: Boolean(payload.shadow_mode)
    });

    return new Response(
      JSON.stringify({
        schema_version: "1.0.0",
        event_id: payload.event_id,
        asset: asset,
        agent_2_output: agent2Veto,
        fallback_mode: false,
        broadcast_decision: "discard"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ----------------------------------------------------------------------------
  // Paso 2: Matriz Cuantitativa Desacoplada (Math First!)
  // ----------------------------------------------------------------------------
  const mathResult = calculateDeterministicConfluence(
    payload.deterministic_inputs,
    setupType,
    asset,
    minsToNextTier1
  );

  // Si NO es un evento estructural significativo (microScore < 25), log silencioso a $0 costo
  if (!mathResult.isStructuralEventSignificant) {
    const decision = "log_only";
    const status = "active";

    const agent2Math: Agent2Output = {
      macro_blackout: false,
      cross_asset_confirmation: mathResult.crossAssetStatus,
      session_liquidity_bias: mathResult.sessionBiasLabel,
      confluence_score: mathResult.confluenceScore,
      score_label: mathResult.scoreLabel,
      veto_reason: null,
      latency_ms: Date.now() - startTime
    };

    await supabaseAdmin.from("trading_signal_events").insert({
      event_id: payload.event_id,
      symbol: asset,
      display_name: payload.display_name || asset,
      trigger_type: setupType,
      current_price: payload.current_price,
      market_data: payload.market_data || {},
      llm_verdict: `Evento Estructural Menor: MicroScore ${mathResult.microScore}/40 (Score ${mathResult.confluenceScore}/100).`,
      status: status,
      schema_version: "1.0.0",
      confluence_score: mathResult.confluenceScore,
      score_label: mathResult.scoreLabel,
      broadcast_decision: decision,
      agent_2_output: agent2Math,
      fallback_mode: false,
      shadow_mode: Boolean(payload.shadow_mode)
    });

    return new Response(
      JSON.stringify({
        schema_version: "1.0.0",
        event_id: payload.event_id,
        asset: asset,
        confluence_score: mathResult.confluenceScore,
        score_label: mathResult.scoreLabel,
        agent_2_output: agent2Math,
        fallback_mode: false,
        broadcast_decision: decision
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ----------------------------------------------------------------------------
  // Paso 3: Evento Estructural Significativo -> Invocación a Gemini MAS
  // ----------------------------------------------------------------------------
  const precalculatedInvalidation = calculateStructuralInvalidation(
    payload.deterministic_inputs.zap_price_range,
    setupType,
    payload.current_price,
    asset
  );

  let calendarStatus = "none";
  if (minsToNextTier1 !== null) {
    if (minsToNextTier1 < 0) {
      calendarStatus = `past (${Math.abs(minsToNextTier1)} min atrás - Digerido / Asimilado)`;
    } else {
      calendarStatus = `upcoming (en ${minsToNextTier1} min - Pendiente)`;
    }
  }

  let fallbackMode = false;
  let agent1Result: { event_type: string; bias: "compra" | "venta" | "neutral"; hypothesis: string; structuralInvalidation: number };
  let sessionNarrative = mathResult.sessionBiasLabel;
  let macroDriverContext = "Contexto macroeconómico neutral.";

  if (!aiApiKey) {
    fallbackMode = true;
    agent1Result = deterministicBiasFallback(
      payload.deterministic_inputs.zap_price_range,
      setupType,
      payload.deterministic_inputs.liquidity_state,
      payload.current_price,
      asset
    );
  } else {
    // Disparo en Paralelo Real vía Promise.allSettled
    const [resAgent1, resAgent2] = await Promise.allSettled([
      callAgent1_TacticalHypothesis(payload, precalculatedInvalidation, aiApiKey),
      callAgent2_MacroRiskContext(payload, calendarStatus, aiApiKey)
    ]);

    // Evaluación de Agente 1 (Táctico)
    if (resAgent1.status === "fulfilled") {
      agent1Result = resAgent1.value;

      // CANDADO DETERMINISTA: Filtro Regex Denylist Anti-Oráculo post-generación
      if (ORACLE_DENYLIST_REGEX.test(agent1Result.hypothesis)) {
        console.warn(`[MAS Guardrail] ⚠️ Denylist activada en Agente 1: "${agent1Result.hypothesis}". Reemplazando con fallback determinista.`);
        fallbackMode = true;
        agent1Result = deterministicBiasFallback(
          payload.deterministic_inputs.zap_price_range,
          setupType,
          payload.deterministic_inputs.liquidity_state,
          payload.current_price,
          asset
        );
      }
    } else {
      fallbackMode = true;
      agent1Result = deterministicBiasFallback(
        payload.deterministic_inputs.zap_price_range,
        setupType,
        payload.deterministic_inputs.liquidity_state,
        payload.current_price,
        asset
      );
    }

    // Evaluación de Agente 2 (Macro Context)
    if (resAgent2.status === "fulfilled") {
      sessionNarrative = resAgent2.value.session_liquidity_bias;
      macroDriverContext = resAgent2.value.macro_driver_context;
    } else {
      const fbSession = deterministicSessionBiasFallback(
        payload.deterministic_inputs.ema50_slope,
        payload.deterministic_inputs.daily_briefing_bias
      );
      sessionNarrative = `Régimen ${fbSession.toUpperCase()} determinista`;
    }
  }

  // Asegurar que el número de invalidación sea exactamente el precalculado
  agent1Result.structuralInvalidation = precalculatedInvalidation;

  const totalLatencyMs = Date.now() - startTime;

  const agent1Final: Agent1Output = {
    event_type: agent1Result.event_type,
    bias: agent1Result.bias,
    hypothesis: agent1Result.hypothesis,
    structural_invalidation_price: agent1Result.structuralInvalidation,
    latency_ms: totalLatencyMs
  };

  const agent2Final: Agent2Output = {
    macro_blackout: false,
    cross_asset_confirmation: mathResult.crossAssetStatus,
    session_liquidity_bias: sessionNarrative,
    macro_driver_context: macroDriverContext,
    confluence_score: mathResult.confluenceScore,
    score_label: mathResult.scoreLabel,
    veto_reason: null,
    latency_ms: totalLatencyMs
  };

  // ----------------------------------------------------------------------------
  // Paso 4: Política de Broadcast y Persistencia de Alerta Estructural
  // ----------------------------------------------------------------------------
  const isShadowMode = Boolean(payload.shadow_mode);
  const broadcastDecision = isShadowMode ? "log_only" : "emit";

  // Inserción en public.trading_signal_events
  const { data: insertedEvent, error: insertError } = await supabaseAdmin
    .from("trading_signal_events")
    .insert({
      event_id: payload.event_id,
      symbol: asset,
      display_name: payload.display_name || asset,
      trigger_type: setupType,
      current_price: payload.current_price,
      market_data: payload.market_data || {},
      llm_verdict: agent1Final.hypothesis,
      status: "active",
      schema_version: "1.0.0",
      confluence_score: mathResult.confluenceScore,
      score_label: mathResult.scoreLabel,
      broadcast_decision: broadcastDecision,
      agent_1_output: agent1Final,
      agent_2_output: agent2Final,
      fallback_mode: fallbackMode,
      shadow_mode: isShadowMode,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Error al persistir trading_signal_events: ${insertError.message}`);
  }

  // Fan-Out Realtime de Alerta Estructural Contextual
  if (broadcastDecision === "emit") {
    const alertBroadcastPayload = {
      id: insertedEvent.id,
      event_id: insertedEvent.event_id,
      alert_type: "structural_context",
      symbol: insertedEvent.symbol,
      display_name: insertedEvent.display_name,
      trigger_type: insertedEvent.trigger_type,
      current_price: insertedEvent.current_price,
      llm_verdict: insertedEvent.llm_verdict,
      confluence_score: mathResult.confluenceScore,
      score_label: mathResult.scoreLabel,
      broadcast_decision: "emit",
      agent_1_output: agent1Final,
      agent_2_output: agent2Final,
      created_at: insertedEvent.created_at
    };

    broadcastAlert(supabaseAdmin, alertBroadcastPayload).catch(() => {});
  }

  // ----------------------------------------------------------------------------
  // Paso 5: Respuesta Final con Contrato MAS v1.0.0
  // ----------------------------------------------------------------------------
  return new Response(
    JSON.stringify({
      schema_version: "1.0.0",
      event_id: payload.event_id,
      asset: asset,
      session: payload.session || "new_york",
      timestamp: new Date().toISOString(),
      trigger_source: "python_engine",
      shadow_mode: isShadowMode,
      deterministic_inputs: payload.deterministic_inputs,
      agent_1_output: agent1Final,
      agent_2_output: agent2Final,
      fallback_mode: fallbackMode,
      broadcast_decision: broadcastDecision
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
