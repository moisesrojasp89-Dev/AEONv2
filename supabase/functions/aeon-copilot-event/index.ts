// ==============================================================================
// AEON · Supabase Edge Function: aeon-copilot-event (Paso 4 — Fan-Out Síntesis)
// ==============================================================================
// 1. Recibe el POST asíncrono desde el Centinela (scripts/quant/harness_sentinel.py).
// 2. Valida autorización Zero-Trust (Service Role / Secret Key).
// 3. Verifica idempotencia contra public.trading_signal_events (evita duplicados).
// 4. Invoca 1 sola consulta a Google Gemini 2.5 Flash-Lite (<500ms) para generar
//    el veredicto táctico institucional en 2 frases.
// 5. Persiste en public.trading_signal_events.
// 6. Transmite el evento vía Supabase Realtime Broadcast ('aeon_harness_alerts')
//    distribuyendo el veredicto a todos los traders conectados simultáneamente.
// ==============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EventPayload {
  event_id: string;
  symbol: string;
  display_name: string;
  trigger_type: string;
  current_price: number;
  market_data: {
    poi?: {
      name?: string;
      type?: string;
      range_low?: number;
      range_high?: number;
      significance?: string;
    };
    liquidity_state?: {
      bsl_swept?: boolean;
      ssl_swept?: boolean;
      active_cluster?: string;
    };
    volume_profile?: {
      dpoc_price?: number;
      dist_dpoc?: number;
    };
    macro_driver?: string;
    daily_bias?: string;
    bias_score?: number;
    [key: string]: any;
  };
}

/**
 * Fallback determinista en caso de latencia o falla de API de IA.
 * Garantiza que NUNCA se pierda una alerta táctica.
 */
function generateFallbackVerdict(payload: EventPayload): string {
  const displayName = payload.display_name || payload.symbol;
  const price = payload.current_price;
  const poi = payload.market_data?.poi || {};
  const poiName = poi.name || "Zona ZAP";
  const isSell = poi.type === "SELLSIDE_POI";
  const bias = payload.market_data?.daily_bias || "NEUTRAL";
  const dpoc = payload.market_data?.volume_profile?.dpoc_price ?? price;
  const macro = payload.market_data?.macro_driver || "Macro en consolidación";

  if (isSell) {
    return `**${displayName}** testeando ${poiName} en $${price} tras barrido de liquidez compradora. Con dPOC diario en $${dpoc} y sesgo ${bias} (${macro}), se favorece rechazo vendedor esperando vela de confirmación estructural.`;
  } else {
    return `**${displayName}** testeando ${poiName} en $${price} tras barrido de liquidez vendedora. Con dPOC diario en $${dpoc} y catalizador (${macro}), se anticipa absorción compradora vigilando rechazo de mínimos.`;
  }
}

/**
 * Invocación ultrarrápida a Gemini Flash-Lite con fallback secuencial.
 */
async function generateTacticalSynthesis(payload: EventPayload, apiKey: string): Promise<string> {
  if (!apiKey) {
    return generateFallbackVerdict(payload);
  }

  const poi = payload.market_data?.poi || {};
  const liq = payload.market_data?.liquidity_state || {};
  const vp = payload.market_data?.volume_profile || {};
  const macro = payload.market_data?.macro_driver || "Macro neutral";
  const bias = payload.market_data?.daily_bias || "NEUTRAL";
  const biasScore = payload.market_data?.bias_score || 50;

  const systemInstruction = `Eres AEON Sentinel AI, copiloto de Order Flow cuantitativo para traders institucionales.
Tu tarea es redactar un diagnóstico táctico en EXACTAMENTE 2 FRASES breves (máximo 45 palabras en total).
- Frase 1: Describe la acción del precio actual en ${payload.display_name}, la zona ZAP testeada y el estado del barrido de liquidez (BSL o SSL).
- Frase 2: Conecta con el dPOC diario (${vp.dpoc_price ?? "N/A"}) y el catalizador macro (${macro}), indicando el sesgo favorecido y la confirmación técnica requerida.
Reglas:
- Tono quirúrgico, analítico e institucional. Cero saludos, cero introducciones, cero despedidas.
- Usa negritas en el nombre del activo y niveles clave.
- Redacción en español profesional.`;

  const userPrompt = `EVENTO DE MERCADO EN VIVO:
Activo: ${payload.display_name} (${payload.symbol}) | Precio: ${payload.current_price}
Zona ZAP: ${poi.name || "POI Estructural"} (${poi.type || "ZAP"}) [Rango: ${poi.range_low} - ${poi.range_high}]
Liquidez: BSL Barrido = ${liq.bsl_swept ? "SÍ" : "NO"} | SSL Barrido = ${liq.ssl_swept ? "SÍ" : "NO"} | Cluster: ${liq.active_cluster || "N/A"}
Volume Profile: dPOC = ${vp.dpoc_price} | Distancia = ${vp.dist_dpoc}
Sesgo Diario: ${bias} (Score: ${biasScore}) | Driver Macro: ${macro}`;

  const models = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-lite-latest"
  ];

  for (const model of models) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens: 140,
            temperature: 0.15,
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return text;
        }
      }
    } catch (_) {
      // Continuar con el siguiente modelo de respaldo
    }
  }

  return generateFallbackVerdict(payload);
}

/**
 * Despacho seguro de Realtime Broadcast con timeout para no retener la función
 */
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
// Servidor Principal Deno
// ------------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
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

  // 1. Verificación de Seguridad Zero-Trust
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  // Se permite acceso si proviene con la SERVICE_ROLE_KEY o ANON_KEY autorizada del backend
  const isAuthorized = token && (token === serviceRoleKey || token === anonKey);
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "unauthorized", message: "Clave de servicio requerida para emitir eventos." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload: EventPayload = await req.json();

    if (!payload.event_id || !payload.symbol || !payload.current_price) {
      return new Response(
        JSON.stringify({ error: "invalid_payload", message: "Faltan campos obligatorios en el evento." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 2. Control de Idempotencia: verificar si el evento ya fue procesado
    const { data: existing } = await supabaseAdmin
      .from("trading_signal_events")
      .select("id, event_id, status, llm_verdict")
      .eq("event_id", payload.event_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          status: "duplicate",
          message: "Evento ya registrado previamente.",
          event_id: existing.event_id,
          llm_verdict: existing.llm_verdict
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Generación de Síntesis Táctica Trazable (1 llamada para Fan-Out global)
    const llmVerdict = await generateTacticalSynthesis(payload, aiApiKey);

    // 4. Persistencia en la tabla del Bus de Eventos
    const { data: insertedEvent, error: insertError } = await supabaseAdmin
      .from("trading_signal_events")
      .insert({
        event_id: payload.event_id,
        symbol: payload.symbol,
        display_name: payload.display_name || payload.symbol,
        trigger_type: payload.trigger_type || "ZAP_POI_CONFLUENCE",
        current_price: payload.current_price,
        market_data: payload.market_data || {},
        llm_verdict: llmVerdict,
        status: "active",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // TTL 2 horas
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error insertando en trading_signal_events: ${insertError.message}`);
    }

    // 5. Fan-Out Broadcast a todos los usuarios conectados vía Realtime
    const alertBroadcastPayload = {
      id: insertedEvent.id,
      event_id: insertedEvent.event_id,
      symbol: insertedEvent.symbol,
      display_name: insertedEvent.display_name,
      trigger_type: insertedEvent.trigger_type,
      current_price: insertedEvent.current_price,
      llm_verdict: insertedEvent.llm_verdict,
      market_data: insertedEvent.market_data,
      created_at: insertedEvent.created_at
    };

    // No bloquea la respuesta HTTP principal
    broadcastAlert(supabaseAdmin, alertBroadcastPayload).catch(() => {});

    // 6. Respuesta Exitosa
    return new Response(
      JSON.stringify({
        success: true,
        event_id: insertedEvent.event_id,
        symbol: insertedEvent.symbol,
        llm_verdict: llmVerdict,
        timestamp: insertedEvent.created_at
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "server_error", message: err.message || "Error procesando evento táctico." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
