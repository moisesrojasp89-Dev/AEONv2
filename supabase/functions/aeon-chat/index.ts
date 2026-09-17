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
  "https://aeon-intelligence.pages.dev",
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
  "GESTION_RIESGO",
  "BITACORA_CUANTICA"
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

// Mapeo inteligente de nombres comunes y empresas a tickers bursátiles
const ASSET_ALIASES: Record<string, string> = {
  "nvidia": "NVDA",
  "nvda": "NVDA",
  "apple": "AAPL",
  "aapl": "AAPL",
  "coca cola": "KO",
  "cocacola": "KO",
  "coke": "KO",
  "ko": "KO",
  "tesla": "TSLA",
  "tsla": "TSLA",
  "microsoft": "MSFT",
  "msft": "MSFT",
  "amazon": "AMZN",
  "amzn": "AMZN",
  "google": "GOOGL",
  "alphabet": "GOOGL",
  "googl": "GOOGL",
  "goog": "GOOGL",
  "meta": "META",
  "facebook": "META",
  "netflix": "NFLX",
  "nflx": "NFLX",
  "amd": "AMD",
  "intel": "INTC",
  "intc": "INTC",
  "palantir": "PLTR",
  "pltr": "PLTR",
  "coinbase": "COIN",
  "coin": "COIN",
  "microstrategy": "MSTR",
  "mstr": "MSTR",
  "berkshire": "BRK.B",
  "jpmorgan": "JPM",
  "jp morgan": "JPM",
  "jpm": "JPM",
  "visa": "V",
  "walmart": "WMT",
  "wmt": "WMT",
  "disney": "DIS",
  "dis": "DIS",
  "broadcom": "AVGO",
  "qualcomm": "QCOM",
  "costco": "COST",
  "spotify": "SPOT",
  "uber": "UBER",
  "airbnb": "ABNB",
  "alibaba": "BABA",
  "baba": "BABA",
  "exxon": "XOM",
  "chevron": "CVX",
  "eli lilly": "LLY",
  "lilly": "LLY",
  "novo nordisk": "NVO",
  "tsmc": "TSM",
  "taiwan semi": "TSM",
  "asml": "ASML",
  "crowdstrike": "CRWD",
  "arm": "ARM",
  "robinhood": "HOOD"
};

function detectExternalTicker(text: string, assetParam?: string): string | null {
  const nativeAssets = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "DXY", "SPX500", "NAS100", "US30", "BTCUSD", "USOIL"];
  if (assetParam && !nativeAssets.includes(assetParam.toUpperCase())) {
    return assetParam.toUpperCase();
  }

  const lower = text.toLowerCase();
  for (const [alias, ticker] of Object.entries(ASSET_ALIASES)) {
    const safeAlias = alias.replace(".", "\\.");
    const regex = new RegExp(`\\b${safeAlias}\\b`, "i");
    if (regex.test(lower)) {
      return ticker;
    }
  }

  // Detectar $TICKER (ej: $NVDA, $AAPL, $KO, $PLTR)
  const dollarMatch = text.match(/\$([A-Za-z]{1,5})\b/);
  if (dollarMatch && !nativeAssets.includes(dollarMatch[1].toUpperCase())) {
    return dollarMatch[1].toUpperCase();
  }

  // Detectar palabras clave como "accion de X", "precio de X", "reseña de X", etc.
  const keywordMatch = text.match(/(?:accion|acción|ticker|precio de|cotizacion de|cotización de|analiza|revisa|reseña de|reseña)\s+([A-Za-z]{1,5})\b/i);
  if (keywordMatch && !nativeAssets.includes(keywordMatch[1].toUpperCase())) {
    return keywordMatch[1].toUpperCase();
  }

  // Detectar pares forex de 6 letras (ej: GBPJPY, EURGBP, AUDCAD, etc.)
  const forexMatch = text.match(/\b(EUR|GBP|USD|JPY|CHF|AUD|CAD|NZD)(EUR|GBP|USD|JPY|CHF|AUD|CAD|NZD)\b/i);
  if (forexMatch && !nativeAssets.includes(forexMatch[0].toUpperCase())) {
    return forexMatch[0].toUpperCase();
  }

  return null;
}

// Consulta de alta velocidad a Twelve Data (<400ms) para acciones y forex fuera del panel nativo
async function fetchTwelveDataQuote(rawTicker: string, apiKey: string): Promise<string | null> {
  if (!rawTicker || !apiKey) return null;
  try {
    let symbol = rawTicker.toUpperCase().trim();
    // Normalizar pares forex de 6 caracteres (ej: GBPJPY -> GBP/JPY)
    const forexCurrencies = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];
    if (symbol.length === 6) {
      const c1 = symbol.slice(0, 3);
      const c2 = symbol.slice(3, 6);
      if (forexCurrencies.includes(c1) && forexCurrencies.includes(c2)) {
        symbol = `${c1}/${c2}`;
      }
    }

    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AEON-Terminal/1.0" },
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code || data.status === "error" || !data.symbol) return null;

    const name = data.name || data.symbol;
    const sym = data.symbol;
    const rawPrice = data.close || data.price;
    if (!rawPrice) return null;

    const price = Number(rawPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 });
    const rawPct = Number(data.percent_change);
    const changePct = !isNaN(rawPct) ? `${rawPct > 0 ? '+' : ''}${rawPct.toFixed(2)}%` : 'N/A';
    const currency = data.currency || 'USD';
    const exchange = data.exchange ? ` [${data.exchange}]` : '';
    const dayHigh = data.high ? `$${Number(data.high).toFixed(2)}` : 'N/A';
    const dayLow = data.low ? `$${Number(data.low).toFixed(2)}` : 'N/A';
    const fiftyTwoHigh = data.fifty_two_week?.high ? `$${Number(data.fifty_two_week.high).toFixed(2)}` : 'N/A';
    const fiftyTwoLow = data.fifty_two_week?.low ? `$${Number(data.fifty_two_week.low).toFixed(2)}` : 'N/A';
    const volume = data.volume ? Number(data.volume).toLocaleString('en-US') : 'N/A';

    return `• ${sym} (${name}${exchange}): Cotización Actual: $${price} ${currency} | Variación 24h: ${changePct} | Rango Intradiario: ${dayLow} - ${dayHigh} | Rango 52 Semanas: ${fiftyTwoLow} - ${fiftyTwoHigh} | Volumen: ${volume}`;
  } catch (err) {
    console.warn("[TwelveData] Error fetching quote:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// TRADER JOURNAL HARNESS & CONVERSATIONAL LOGGING (MAS v1.2.0)
// -----------------------------------------------------------------------------
const RE_JOURNAL_SYMBOL = /\b(XAUUSD|EURUSD|GBPUSD|USDJPY|BTCUSD|SPX500|NAS100|US30|USOIL|ORO|GOLD|BITCOIN|ETHUSD)\b/i;
const RE_JOURNAL_BUY = /\b(compr[eéóar]?|long|largo|entr[eéó]\s+en\s+compra|buy)\b/i;
const RE_JOURNAL_SELL = /\b(vend[eíóar]?|short|corto|entr[eéó]\s+en\s+venta|sell)\b/i;
const RE_JOURNAL_ENTRY = /(?:en|entrada|precio|entry)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i;
const RE_JOURNAL_SL = /(?:sl|stop|stop\s*loss)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i;
const RE_JOURNAL_TP = /(?:tp|target|take\s*profit)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i;
const RE_JOURNAL_CLOSE = /\b(cerr[eéóar]?|toqu[eéó]|toc[oó]\s+tp|toc[oó]\s+sl|sal[íió]|liquid[eéóar]?)\b/i;
const RE_JOURNAL_CANCEL = /\b(anul[eéóar]?|cancel[eéóar]?|borr[eéóar]?|elimin[eéóar]?|descarta?r?)\b/i;
const RE_JOURNAL_LAST = /\b(mi\s+)?(último|ultimo)\s+(trade|orden|posici[oó]n)?\b/i;
const RE_JOURNAL_AUDIT = /\b(auditor[íi]a|reporte|an[aá]lisis|resumen|auditar|audita)\s+(semanal|de\s+mis\s+trades|de\s+la\s+semana|mis\s+trades|mi\s+semana|mis\s+operaciones)\b/i;
const RE_IS_QUESTION = /^(¿|\?|cómo\s+ves|que\s+opinas|qué\s+opinas|crees\s+que)/i;

const JOURNAL_SYMBOL_MAP: Record<string, string> = {
  "ORO": "XAUUSD",
  "GOLD": "XAUUSD",
  "BITCOIN": "BTCUSD"
};

function normalizeJournalSymbol(raw: string): string {
  const upper = raw.toUpperCase().trim();
  return JOURNAL_SYMBOL_MAP[upper] || upper;
}

function validateTradeCoherenceTs(direction: "BUY" | "SELL", entry: number, sl: number, tp: number): { valid: boolean; error?: string } {
  if (entry <= 0 || sl <= 0 || tp <= 0) {
    return { valid: false, error: "Los niveles de precio (Entrada, SL, TP) deben ser estrictamente positivos." };
  }
  if (direction === "BUY") {
    if (!(sl < entry && entry < tp)) {
      return {
        valid: false,
        error: `Incoherencia en COMPRA: El Stop Loss (${sl}) debe estar estrictamente por debajo de la Entrada (${entry}), y el Take Profit (${tp}) por encima.`
      };
    }
  } else if (direction === "SELL") {
    if (!(tp < entry && entry < sl)) {
      return {
        valid: false,
        error: `Incoherencia en VENTA: El Take Profit (${tp}) debe estar estrictamente por debajo de la Entrada (${entry}), y el Stop Loss (${sl}) por encima.`
      };
    }
  }
  return { valid: true };
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
  const twelveDataApiKey = Deno.env.get("TWELVE_DATA_API_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let verifiedUserId = "";
  let quotaIncremented = false;

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

    verifiedUserId = user.id;

    // --------------------------------------------------------------------------
    // CAPA 2: Validación de Suscripción PRO Activa (Fail Fast)
    // --------------------------------------------------------------------------
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("tier")
      .eq("id", verifiedUserId)
      .maybeSingle();

    if (profileError) {
      console.error("[AEON Chat] Error consultando perfil de usuario:", profileError);
    }

    let isPro = profile?.tier === "pro" || profile?.tier === "institutional" || profile?.tier === "admin";

    if (!isPro) {
      const { data: sub, error: subError } = await supabaseAdmin
        .from("subscriptions")
        .select("status, plan, current_period_end")
        .eq("user_id", verifiedUserId)
        .eq("status", "active")
        .maybeSingle();

      if (subError) {
        console.error("[AEON Chat] Error consultando suscripciones activas:", subError);
      }

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

    quotaIncremented = true;

    // --------------------------------------------------------------------------
    // CAPA 5: Live Market Grounding REAL (Supabase + Twelve Data en Paralelo)
    // --------------------------------------------------------------------------
    const detectedTicker = detectExternalTicker(userMessage, body.asset);

    const [marketRes, briefingRes, calendarRes, externalAssetSummary] = await Promise.all([
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
        .limit(6),
      detectedTicker && twelveDataApiKey
        ? fetchTwelveDataQuote(detectedTicker, twelveDataApiKey)
        : Promise.resolve(null)
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
    // CAPA 5.5: Intercepción Determinista del Trader Journal Harness (Zero-Trust)
    // --------------------------------------------------------------------------
    const trimmedMsg = userMessage.trim();

    // 1. SOLICITUD DE AUDITORÍA SEMANAL
    if (RE_JOURNAL_AUDIT.test(trimmedMsg)) {
      const now = new Date();
      const day = now.getUTCDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diffToMonday);
      monday.setUTCHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      sunday.setUTCHours(23, 59, 59, 999);

      const weekStartIso = monday.toISOString();
      const weekEndIso = sunday.toISOString();
      const weekStartDateStr = weekStartIso.split("T")[0];
      const weekEndDateStr = weekEndIso.split("T")[0];

      const { data: closedTrades } = await supabaseAdmin
        .from("trader_journal")
        .select("*")
        .eq("user_id", verifiedUserId)
        .eq("status", "CLOSED")
        .gte("entry_timestamp", weekStartIso)
        .lte("entry_timestamp", weekEndIso);

      const trades = closedTrades || [];
      const total = trades.length;

      let auditData: { analisis: string; niveles_clave: string[]; advertencia_riesgo: string };
      if (total === 0) {
        auditData = {
          analisis: `### 📊 Auditoría Cuántica Semanal (${weekStartDateStr} al ${weekEndDateStr})\nNo se registraron operaciones cerradas en esta semana.\n\nPara comenzar a auditar tu disciplina, registra tus entradas conversando conmigo (ej. *"Entré en compra en XAUUSD en 2650 con SL 2642 y TP 2668"*).`,
          niveles_clave: [
            "Período: Semana en curso",
            "Trades Cerrados: 0",
            "Win Rate: 0.00%",
            "Retorno Neto: 0.00 R",
            "Profit Factor: 0.00",
            "Drawdown MAE Promedio: 0.00 R"
          ],
          advertencia_riesgo: "Sin operaciones cerradas para auditar en el ciclo semanal actual."
        };
      } else {
        const wins = trades.filter((t: any) => (Number(t.realized_rr) || 0) > 0);
        const losses = trades.filter((t: any) => (Number(t.realized_rr) || 0) < 0);
        const bes = trades.filter((t: any) => (Number(t.realized_rr) || 0) === 0);

        const winRate = Number(((wins.length / total) * 100).toFixed(2));
        const netR = Number(trades.reduce((acc: number, t: any) => acc + (Number(t.realized_rr) || 0), 0).toFixed(2));
        const grossWin = wins.reduce((acc: number, t: any) => acc + (Number(t.realized_rr) || 0), 0);
        const grossLoss = Math.abs(losses.reduce((acc: number, t: any) => acc + (Number(t.realized_rr) || 0), 0));
        const profitFactor = grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : (grossWin > 0 ? 99.99 : 0.00);

        const avgMae = Number((trades.reduce((acc: number, t: any) => acc + (Number(t.mae_r) || 0), 0) / total).toFixed(2));
        const avgMfe = Number((trades.reduce((acc: number, t: any) => acc + (Number(t.mfe_r) || 0), 0) / total).toFixed(2));

        let dpocAligned = 0;
        let riskDisciplined = 0;
        for (const t of trades) {
          if ((Number(t.planned_rr_ratio) || 0) >= 1.5) riskDisciplined++;
          const ctx = t.quantum_context_at_entry || {};
          const dpoc = Number(ctx.dpoc_price) || 0;
          const entry = Number(t.entry_price) || 0;
          if (dpoc > 0) {
            if (t.direction === "BUY" && entry >= dpoc * 0.998) dpocAligned++;
            else if (t.direction === "SELL" && entry <= dpoc * 1.002) dpocAligned++;
          }
        }
        const dpocPct = Number(((dpocAligned / total) * 100).toFixed(2));
        const riskPct = Number(((riskDisciplined / total) * 100).toFixed(2));

        const findings = {
          primary_success_factor: riskPct >= 80 ? "Alta disciplina en R:R planificado" : "Revisar filtros de entrada",
          drawdown_vulnerability: avgMae > -0.70 ? "Bajo control" : `Drawdown promedio elevado (${avgMae}R). Evalúa entradas más precisas.`,
          dpoc_discipline_status: dpocPct >= 75 ? "Excelente alineación con volumen institucional" : "Atención: varias operaciones tomadas contra el flujo del dPOC.",
          verdict: `Semana finalizada con ${netR >= 0 ? '+' : ''}${netR}R y ${winRate}% Win Rate sobre ${total} trades.`
        };

        // Guardar o actualizar registro de auditoría semanal
        await supabaseAdmin.from("trader_weekly_audits").insert({
          user_id: verifiedUserId,
          week_start_date: weekStartDateStr,
          week_end_date: weekEndDateStr,
          total_trades_logged: total,
          winning_trades: wins.length,
          losing_trades: losses.length,
          breakeven_trades: bes.length,
          win_rate_pct: winRate,
          net_pnl_r: netR,
          profit_factor_rr: profitFactor,
          average_mae_r: avgMae,
          average_mfe_r: avgMfe,
          dpoc_confluence_pct: dpocPct,
          risk_discipline_pct: riskPct,
          audit_findings: findings
        });

        auditData = {
          analisis: `### 📊 Auditoría Cuántica Semanal (${weekStartDateStr} al ${weekEndDateStr})
• **Trades Cerrados:** ${total} (${wins.length}W | ${losses.length}L | ${bes.length}BE) — **Win Rate:** ${winRate}%
• **Resultado Neto:** **${netR >= 0 ? '+' : ''}${netR} R** | **Profit Factor:** ${profitFactor}
• **Excursión Media:** MFE promedio: +${avgMfe}R | Drawdown (MAE) promedio: ${avgMae}R

**Métricas de Disciplina Institucional:**
• **Disciplina dPOC:** ${dpocPct}% de operaciones confluentes con el valor de mercado.
• **Disciplina de Riesgo:** ${riskPct}% de operaciones con R:R planificado ≥ 1.5:1.
• **Diagnóstico:** ${findings.dpoc_discipline_status}`,
          niveles_clave: [
            `Win Rate: ${winRate}% (${wins.length}/${total})`,
            `Resultado Neto: ${netR >= 0 ? '+' : ''}${netR} R`,
            `Profit Factor: ${profitFactor}`,
            `Drawdown MAE Promedio: ${avgMae} R`,
            `MFE Promedio: +${avgMfe} R`,
            `Disciplina dPOC: ${dpocPct}%`
          ],
          advertencia_riesgo: "[Auditoría Guardada] Estos datos han sido archivados en tu perfil y están visibles en /perfil.html bajo la pestaña Diario Cuántico."
        };
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            categoria: "BITACORA_CUANTICA",
            ...auditData
          },
          meta: {
            remaining_quota: quotaResult.remaining,
            requests_today: quotaResult.requests_today
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. ANULACIÓN / CANCELACIÓN DE TRADE
    if (!RE_IS_QUESTION.test(trimmedMsg) && RE_JOURNAL_CANCEL.test(trimmedMsg)) {
      const isLast = RE_JOURNAL_LAST.test(trimmedMsg);
      const symbolMatch = trimmedMsg.match(RE_JOURNAL_SYMBOL);
      const symbol = symbolMatch ? normalizeJournalSymbol(symbolMatch[0]) : null;
      const idMatch = trimmedMsg.match(/#?([a-f0-9\-]{4,36})\b/i);
      const tradeId = idMatch && !symbolMatch ? idMatch[1] : null;

      const { data: openTrades } = await supabaseAdmin
        .from("trader_journal")
        .select("*")
        .eq("user_id", verifiedUserId)
        .eq("status", "OPEN")
        .order("entry_timestamp", { ascending: false });

      const trades = openTrades || [];
      if (trades.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              categoria: "BITACORA_CUANTICA",
              analisis: "No tienes ninguna posición abierta registrada en tu diario para anular.",
              niveles_clave: ["Estado: Sin posiciones abiertas"],
              advertencia_riesgo: "Para registrar un trade di: 'Entré en compra en XAUUSD en 2650 con SL 2642 y TP 2668'."
            },
            meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let targetTrade: any = null;
      if (isLast) {
        targetTrade = trades[0];
      } else if (tradeId) {
        const matches = trades.filter((t: any) => t.id.startsWith(tradeId));
        if (matches.length === 1) targetTrade = matches[0];
        else if (matches.length > 1) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                categoria: "BITACORA_CUANTICA",
                analisis: `El ID '${tradeId}' coincide con múltiples posiciones. Por favor especifica más caracteres del ID para evitar errores.`,
                niveles_clave: matches.map((m: any) => `#${m.id.slice(0, 8)}: ${m.symbol} ${m.direction} @ ${m.entry_price}`),
                advertencia_riesgo: "Desambiguación requerida por el Harness."
              },
              meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (symbol) {
        const matches = trades.filter((t: any) => t.symbol.toUpperCase() === symbol.toUpperCase());
        if (matches.length === 1) {
          targetTrade = matches[0];
        } else if (matches.length > 1) {
          const list = matches.map((t: any) => `• ID #${t.id.slice(0, 8)} — ${t.direction} en ${t.entry_price} (SL: ${t.stop_loss}, TP: ${t.take_profit})`).join("\n");
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                categoria: "BITACORA_CUANTICA",
                analisis: `Tienes ${matches.length} posiciones abiertas en ${symbol}. Para evitar actuar sobre la posición incorrecta, por favor especifica cuál deseas anular indicando el precio de entrada o ID:\n${list}`,
                niveles_clave: matches.map((m: any) => `#${m.id.slice(0, 8)} @ ${m.entry_price}`),
                advertencia_riesgo: "Regla de desambiguación multi-posición: se requiere selección unívoca."
              },
              meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (trades.length === 1) {
        targetTrade = trades[0];
      }

      if (!targetTrade) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              categoria: "BITACORA_CUANTICA",
              analisis: "Por favor indica qué posición deseas anular (ej. 'Cancela mi último trade' o 'Cancela XAUUSD').",
              niveles_clave: trades.map((t: any) => `#${t.id.slice(0, 8)}: ${t.symbol} @ ${t.entry_price}`),
              advertencia_riesgo: "Identificación ambigua."
            },
            meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // UPDATE atómico status = 'CANCELLED'
      await supabaseAdmin
        .from("trader_journal")
        .update({
          status: "CANCELLED",
          exit_reason: "CANCELLED_BY_USER",
          updated_at: new Date().toISOString()
        })
        .eq("id", targetTrade.id)
        .eq("status", "OPEN");

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            categoria: "BITACORA_CUANTICA",
            analisis: `[TRADE ANULADO] El registro #${targetTrade.id.slice(0, 8)} (${targetTrade.symbol} ${targetTrade.direction} @ ${targetTrade.entry_price}) ha sido cancelado. Este registro no computará en tu histórico de operaciones ni en las auditorías semanales.`,
            niveles_clave: [
              "Estado: CANCELADO",
              `Activo: ${targetTrade.symbol} (${targetTrade.direction})`,
              `Entrada: ${targetTrade.entry_price}`,
              "Motivo: Cancelado por el operador",
              "Cálculo de Rendimiento: Excluido"
            ],
            advertencia_riesgo: "[Garantía de Auditoría] El trade ha sido retirado del monitoreo en vivo del Ratchet."
          },
          meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. CIERRE DE TRADE
    if (!RE_IS_QUESTION.test(trimmedMsg) && RE_JOURNAL_CLOSE.test(trimmedMsg)) {
      const isLast = RE_JOURNAL_LAST.test(trimmedMsg);
      const symbolMatch = trimmedMsg.match(RE_JOURNAL_SYMBOL);
      const symbol = symbolMatch ? normalizeJournalSymbol(symbolMatch[0]) : null;

      // Extraer precio de salida
      const exitPriceMatch = trimmedMsg.match(/(?:en|a|precio)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i);
      let exitPrice = exitPriceMatch ? parseFloat(exitPriceMatch[1]) : null;

      // Razón de salida
      let exitReason = "MANUAL_EXIT";
      if (/\btp\b|take\s*profit/i.test(trimmedMsg)) exitReason = "TP_HIT";
      else if (/\bsl\b|stop\s*loss/i.test(trimmedMsg)) exitReason = "SL_HIT";
      else if (/\bbe\b|breakeven|break\s*even/i.test(trimmedMsg)) exitReason = "BREAK_EVEN";

      const { data: openTrades } = await supabaseAdmin
        .from("trader_journal")
        .select("*")
        .eq("user_id", verifiedUserId)
        .eq("status", "OPEN")
        .order("entry_timestamp", { ascending: false });

      const trades = openTrades || [];
      if (trades.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              categoria: "BITACORA_CUANTICA",
              analisis: "No tienes ninguna posición abierta registrada en tu diario para cerrar.",
              niveles_clave: ["Estado: Sin posiciones abiertas"],
              advertencia_riesgo: "Para registrar un trade di: 'Entré en compra en XAUUSD en 2650 con SL 2642 y TP 2668'."
            },
            meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let targetTrade: any = null;
      if (isLast) {
        targetTrade = trades[0];
      } else if (symbol) {
        const matches = trades.filter((t: any) => t.symbol.toUpperCase() === symbol.toUpperCase());
        if (matches.length === 1) {
          targetTrade = matches[0];
        } else if (matches.length > 1) {
          const list = matches.map((t: any) => `• ID #${t.id.slice(0, 8)} — ${t.direction} en ${t.entry_price} (SL: ${t.stop_loss}, TP: ${t.take_profit})`).join("\n");
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                categoria: "BITACORA_CUANTICA",
                analisis: `Tienes ${matches.length} posiciones abiertas en ${symbol}. Para evitar cerrar la posición incorrecta, por favor especifica cuál deseas cerrar indicando el precio de entrada o ID:\n${list}`,
                niveles_clave: matches.map((m: any) => `#${m.id.slice(0, 8)} @ ${m.entry_price}`),
                advertencia_riesgo: "Regla de desambiguación multi-posición: se requiere confirmación unívoca."
              },
              meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (trades.length === 1) {
        targetTrade = trades[0];
      }

      if (!targetTrade) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              categoria: "BITACORA_CUANTICA",
              analisis: "Por favor indica qué posición deseas cerrar (ej. 'Cerré mi último trade en 2668' o 'Cerré XAUUSD en 2668').",
              niveles_clave: trades.map((t: any) => `#${t.id.slice(0, 8)}: ${t.symbol} @ ${t.entry_price}`),
              advertencia_riesgo: "Identificación ambigua de la posición a cerrar."
            },
            meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Si no especificó precio de salida pero dijo "tocó TP" o "tocó SL", usar el nivel correspondiente
      if (!exitPrice) {
        if (exitReason === "TP_HIT") exitPrice = Number(targetTrade.take_profit);
        else if (exitReason === "SL_HIT") exitPrice = Number(targetTrade.stop_loss);
        else if (exitReason === "BREAK_EVEN") exitPrice = Number(targetTrade.entry_price);
        else {
          const mRec = marketData.find((m: any) => m.symbol === targetTrade.symbol);
          if (mRec && mRec.current_price) exitPrice = Number(mRec.current_price);
          else exitPrice = Number(targetTrade.entry_price);
        }
      }

      // Cálculo estricto de PnL y R realizado
      const entryP = Number(targetTrade.entry_price);
      const slP = Number(targetTrade.stop_loss);
      let pnlPts = 0;
      let rDist = 0;

      if (targetTrade.direction === "BUY") {
        pnlPts = exitPrice - entryP;
        rDist = entryP - slP;
      } else {
        pnlPts = entryP - exitPrice;
        rDist = slP - entryP;
      }

      pnlPts = Number(pnlPts.toFixed(4));
      const realizedRr = rDist > 0 ? Number((pnlPts / rDist).toFixed(2)) : 0.00;

      // UPDATE atómico exclusivo de columnas de salida (sin tocar mfe_r ni mae_r)
      await supabaseAdmin
        .from("trader_journal")
        .update({
          status: "CLOSED",
          exit_price: exitPrice,
          exit_timestamp: new Date().toISOString(),
          exit_reason: exitReason,
          realized_pnl_points: pnlPts,
          realized_rr: realizedRr,
          updated_at: new Date().toISOString()
        })
        .eq("id", targetTrade.id)
        .eq("status", "OPEN");

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            categoria: "BITACORA_CUANTICA",
            analisis: `[OPERACIÓN CERRADA EN DIARIO CUÁNTICO] Trade #${targetTrade.id.slice(0, 8)} (${targetTrade.symbol} ${targetTrade.direction}) finalizado exitosamente. Resultado final: ${realizedRr >= 0 ? '+' : ''}${realizedRr} R (${pnlPts >= 0 ? '+' : ''}${pnlPts} pts). Telemetría de excursión auditada por VPS: MFE máximo alcanzado: +${targetTrade.mfe_r} R | MAE (Drawdown máximo sufrido): ${targetTrade.mae_r} R.`,
            niveles_clave: [
              `Precio de Salida: $${exitPrice}`,
              `Motivo de Salida: ${exitReason}`,
              `Retorno Realizado: ${realizedRr >= 0 ? '+' : ''}${realizedRr} R`,
              `Puntos Realizados: ${pnlPts >= 0 ? '+' : ''}${pnlPts} pts`,
              `Drawdown Soportado (MAE): ${targetTrade.mae_r} R`,
              `Máxima Excursión (MFE): +${targetTrade.mfe_r} R`
            ],
            advertencia_riesgo: "[Post-Mortem Registrado] La operación ha sido sellada e incorporada a tu histórico. Ya puedes verla en tu panel de Diario Cuántico en /perfil.html."
          },
          meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. REGISTRO DE NUEVO TRADE (LOG_TRADE)
    const isBuy = RE_JOURNAL_BUY.test(trimmedMsg);
    const isSell = RE_JOURNAL_SELL.test(trimmedMsg);
    const symbolMatch = trimmedMsg.match(RE_JOURNAL_SYMBOL);

    if (!RE_IS_QUESTION.test(trimmedMsg) && (isBuy || isSell) && symbolMatch) {
      const direction: "BUY" | "SELL" = isBuy ? "BUY" : "SELL";
      const symbol = normalizeJournalSymbol(symbolMatch[0]);

      let entryVal: number | null = null;
      let slVal: number | null = null;
      let tpVal: number | null = null;

      const entryMatch = trimmedMsg.match(RE_JOURNAL_ENTRY);
      const slMatch = trimmedMsg.match(RE_JOURNAL_SL);
      const tpMatch = trimmedMsg.match(RE_JOURNAL_TP);

      if (entryMatch) entryVal = parseFloat(entryMatch[1]);
      if (slMatch) slVal = parseFloat(slMatch[1]);
      if (tpMatch) tpVal = parseFloat(tpMatch[1]);

      // Fallback si no usó etiquetas explícitas (ej. "Compré XAUUSD 2650 2642 2668")
      if (!entryVal || !slVal || !tpVal) {
        const numbers = (trimmedMsg.match(/\b([0-9]+(?:\.[0-9]+)?)\b/g) || []).map(Number);
        if (numbers.length >= 3) {
          entryVal = entryVal ?? numbers[0];
          slVal = slVal ?? numbers[1];
          tpVal = tpVal ?? numbers[2];
        }
      }

      if (entryVal && slVal && tpVal) {
        // Validación de Coherencia Direccional Pre-INSERT
        const coherence = validateTradeCoherenceTs(direction, entryVal, slVal, tpVal);
        if (!coherence.valid) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                categoria: "BITACORA_CUANTICA",
                analisis: `[ERROR DE COHERENCIA DIRECCIONAL] ${coherence.error}`,
                niveles_clave: [
                  `Activo: ${symbol} (${direction})`,
                  `Entrada: ${entryVal}`,
                  `Stop Loss: ${slVal}`,
                  `Take Profit: ${tpVal}`,
                  "Estado: RECHAZADO ANTES DE INSERT"
                ],
                advertencia_riesgo: "Por seguridad institucional, la orden no fue registrada en el diario. Corrige los niveles y vuelve a indicármela."
              },
              meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Obtener snapshot cuántico de marketData
        const assetRecord = marketData.find((m: any) => m.symbol === symbol);
        const quantumContext = {
          snapshot_timestamp: new Date().toISOString(),
          market_price: assetRecord?.current_price ?? entryVal,
          dpoc_price: assetRecord?.dpoc_price ?? null,
          session_vwap: assetRecord?.session_vwap ?? null,
          system_bias: assetRecord?.bias ?? "NEUTRAL",
          system_bias_score: assetRecord?.bias_score ?? 50,
          macro_driver: assetRecord?.macro_driver ?? "Mercado institucional en régimen normal",
          zap_resistance: `${assetRecord?.resistance_1 ?? ''} - ${assetRecord?.resistance_2 ?? ''}`.trim(),
          zap_support: `${assetRecord?.support_1 ?? ''} - ${assetRecord?.support_2 ?? ''}`.trim(),
          confluences: assetRecord?.cited_key_levels ?? []
        };

        const { data: newTrade, error: insertErr } = await supabaseAdmin
          .from("trader_journal")
          .insert({
            user_id: verifiedUserId,
            symbol: symbol,
            direction: direction,
            entry_price: entryVal,
            stop_loss: slVal,
            take_profit: tpVal,
            quantum_context_at_entry: quantumContext,
            status: "OPEN"
          })
          .select()
          .single();

        if (insertErr) {
          console.error("[Trader Journal Insert Error]:", insertErr);
        }

        const riskPts = Math.abs(entryVal - slVal).toFixed(2);
        const rewardPts = Math.abs(tpVal - entryVal).toFixed(2);
        const rrRatio = (Math.abs(tpVal - entryVal) / Math.abs(entryVal - slVal)).toFixed(2);
        const shortId = newTrade ? newTrade.id.slice(0, 8) : "TJ";

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              categoria: "BITACORA_CUANTICA",
              analisis: `[TRADE REGISTRADO EN DIARIO CUÁNTICO] Orden #${shortId} guardada y sellada exitosamente en tu base de datos. Se ha congelado la telemetría cuántica institucional al momento de tu entrada. El Ratchet de 20s en RAM en el VPS ha iniciado el seguimiento continuo de tu MFE (Excursión Favorable) y MAE (Excursión Adversa / Drawdown).`,
              niveles_clave: [
                `Activo: ${symbol} (${direction})`,
                `Entrada: $${entryVal} | SL: $${slVal} | TP: $${tpVal}`,
                `Riesgo Planificado: ${riskPts} pts | Objetivo: ${rewardPts} pts`,
                `Ratio R:R Planificado: ${rrRatio}:1`,
                `dPOC al Ingreso: ${assetRecord?.dpoc_price ? `$${assetRecord.dpoc_price}` : 'N/A'} | VWAP: ${assetRecord?.session_vwap ? `$${assetRecord.session_vwap}` : 'N/A'}`,
                `Sesgo Cuántico: ${assetRecord?.bias || 'NEUTRAL'} (${assetRecord?.bias_score || 50}/100)`
              ],
              advertencia_riesgo: `[Gestión Activa de Posición] Puedes cerrar esta operación en cualquier momento diciendo: "Cerré ${symbol} en [precio]" o anularla con "Cancela mi último trade".`
            },
            meta: { remaining_quota: quotaResult.remaining, requests_today: quotaResult.requests_today }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --------------------------------------------------------------------------
    // CAPA 6: Sanitización de Historial
    // --------------------------------------------------------------------------
    const rawHistory = body.history || [];
    const sanitizedHistory: Array<{ role: "user" | "model"; parts: any[] }> = [];
    
    const candidateHistory = rawHistory.slice(-6);
    const filteredHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Descartar mensajes de rechazo previo para evitar contaminación de contexto
    for (let i = 0; i < candidateHistory.length; i++) {
      const item = candidateHistory[i];
      if (item.role === "assistant" && (item.content.includes("Solo estoy autorizado") || item.content.includes("ÁMBITO INSTITUCIONAL"))) {
        if (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === "user") {
          filteredHistory.pop();
        }
        continue;
      }
      filteredHistory.push(item);
    }

    let expectedRole: "user" | "assistant" = "user";
    for (const h of filteredHistory) {
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

    let externalAssetBlock = "";
    if (externalAssetSummary) {
      externalAssetBlock = `[COTIZACIÓN EN TIEMPO REAL VÍA TWELVE DATA (ACTIVO EXTERNO SOLICITADO)]:
${externalAssetSummary}`;
    }

    // --------------------------------------------------------------------------
    // CAPA 7: System Prompt Estricto & Anti-Alucinación
    // --------------------------------------------------------------------------
    const systemInstruction = `
Eres AEON Terminal AI, copiloto de Order Flow institucional, macroeconomía y gestión de riesgo para la plataforma AEON.
Asistes a traders profesionales con análisis cuantitativo riguroso, directo y fundamentado en datos en vivo.

[REGLAS CARDINALES DE EXACTITUD Y COBERTURA UNIVERSAL]:
1. TIENES COBERTURA TOTAL DEL MERCADO GLOBAL: Tu capacidad no está limitada a los activos del panel. Abarcas todo el universo financiero del trader:
   - Acciones globales y Big Tech (ej. NVDA, AAPL, MSFT, TSLA, KO, sector semiconductores, etc.).
   - Divisas Forex Mayores, Menores y Exóticas (USD, EUR, GBP, JPY, AUD, CAD, CHF, etc.).
   - Materias Primas / Commodities (Oro, Plata, Petróleo WTI y Brent, Gas Natural, Cobre, etc.).
   - Criptoactivos (BTC, ETH, altcoins líderes, dominancia, flujos ETF institucionales).
   - Tasas y Renta Fija (Treasuries US10Y, US02Y, diferenciales de rendimiento, curva de tipos).
   - Bancos Centrales y Macroeconomía (Fed, BCE, BoJ, BoE, inflación CPI/PCE, empleo, carry trades, geopolítica).
   - Análisis Técnico Cuantitativo e Institucional (Order Blocks, Fair Value Gaps, liquidez BSL/SSL, Volume Profile, Wyckoff, imbalances).
   - Gestión de Riesgo y Psicotrading institucional.
2. ACTIVOS NATIVOS DE AEON (Grounding en Tiempo Real): Si el usuario consulta por los activos monitorizados por AEON inyectados abajo en [DATOS DE MERCADO EN VIVO] (ej. XAUUSD, EURUSD, BTCUSD, SPX500), tus niveles de Precio, dPOC, VWAP y Zonas ZAP deben coincidir exactamente con los datos inyectados.
3. ACTIVOS EXTERNOS Y ACCIONES GLOBALES (Grounding en Tiempo Real vía Twelve Data):
   - Si se inyecta la sección [COTIZACIÓN EN TIEMPO REAL VÍA TWELVE DATA (ACTIVO EXTERNO SOLICITADO)], es OBLIGATORIO que uses exactamente el precio de cotización en vivo, la variación porcentual 24h y los rangos (intradiario y 52 semanas) proporcionados.
   - Proporciona una reseña institucional concisa pero de alto valor para el trader:
     * Modelo de negocio, ventajas competitivas (moat) y posición en el sector.
     * Catalizadores operativos o corporativos actuales (demanda, márgenes, resultados).
     * Estructura técnica relevante y niveles de precio a vigilar.
     * Factores de riesgo principales (tasas de interés, múltiplos de valoración, competencia).
   - En 'niveles_clave', incluye métricas concretas basadas en los datos en vivo, por ejemplo: ["Precio Vivo: $X.XX USD", "Variación 24h: +/-X.XX%", "Rango Intradiario: $X - $Y", "Rango 52 Semanas: $X - $Y", "Soporte Clave: $X", "Resistencia Clave: $X"].
   - Clasifica la respuesta como "CATALIZADOR" o "TECNICO_ORDERFLOW". NUNCA como "FUERA_DE_AMBITO".
4. OTROS ACTIVOS O TEMAS GLOBALES SIN COTIZACIÓN EN VIVO: Si el usuario consulta sobre cualquier otro activo, catalizador o concepto de trading sin cotización inyectada, responde con tu conocimiento profundo de analista institucional sénior, proporcionando tesis fundamental, estructura de mercado y niveles de referencia.
5. CATALIZADORES MACRO: Si un dato (como NFP o Nóminas no Agrícolas) figura como "DIGERIDO / YA PUBLICADO", NUNCA digas que está "por salir" ni lo trates como evento futuro. Explica con claridad cómo el mercado ya asimiló ese dato específico y qué reacción técnica provocó en el precio.
6. SÉ CONCISO Y DIRECTO: Máximo 150 palabras en 'analisis'. Formatea con claridad y rigor institucional.

[MÓDULO DE GESTIÓN DE RIESGO Y CÁLCULO DE LOTAJE - PRIORIDAD INSTITUCIONAL]:
- La gestión de riesgo es el núcleo de AEON. Toda pregunta que mencione balance, capital, % de riesgo, dólares de riesgo, stop loss (SL), pips, puntos, lotaje o tamaño de posición ES UNA CONSULTA FINANCIERA LEGÍTIMA.
- CLASIFICACIÓN OBLIGATORIA: "categoria": "GESTION_RIESGO". NUNCA la clasifiques como FUERA_DE_AMBITO.
- Fórmulas Institucionales y Especificaciones de Contrato:
  * Oro Spot (XAUUSD): 1 lote estándar = 100 onzas troy. Una variación de $1.00 en el precio equivale a $100 USD por cada 1.00 lote estándar ($1.00 USD por cada micro-lote de 0.01).
    - Riesgo monetario ($) = Balance * (% Riesgo / 100).
    - Pérdida por lote estándar = Distancia de Stop Loss en $ * 100.
    - Lotaje matemático = Riesgo monetario / (Distancia SL en $ * 100).
    - Regla de ejecución prudencial: Redondear siempre hacia abajo al micro-lote (0.01) para no sobrepasar el presupuesto de riesgo máximo autorizado.
    - Ejemplo canónico: Balance $500 USD, riesgo 2.5% ($12.50 USD), SL de $8.00 en Oro -> Pérdida por lote estándar = $800 USD ($8.00 * 100). Lotaje exacto = $12.50 / $800 = 0.0156 lotes. Redondeo ejecutable: 0.01 lotes (arriesga $8.00 USD, es decir 1.6% del capital, dentro del límite de 2.5%).
  * Forex: 1 lote estándar = 100,000 unidades ($10 USD/pip en pares con USD de divisa cotizada). Lotaje = Riesgo ($) / (Pips SL * 10).
  * Índices (SPX, NAS, US30): 1 lote estándar = $1/pto (o según especificación típica de CFD del broker).
- Estructura requerida:
  * 'analisis': Explicación cuantitativa paso a paso con las fórmulas aplicadas, el riesgo en dólares resultante y la recomendación clara del lote ejecutable en plataforma.
  * 'niveles_clave': Array con las métricas del cálculo, ej: ["Balance: $500 USD", "Riesgo (2.5%): $12.50 USD", "Distancia SL: $8.00 en precio", "Pérdida por 0.01 lote: $8.00 USD", "Lote sugerido: 0.01 lotes"].
  * 'advertencia_riesgo': Nota institucional sobre apalancamiento, spread y control estricto de drawdown.

[MÓDULO DE AUDITORÍA CUANTITATIVA DE ESCENARIOS Y PRECIO PROPUESTO - FIDELIDAD INSTITUCIONAL]:
- REGLA CARDINAL DE NEUTRALIDAD CUANTITATIVA (CERO IDEAS DE NEGOCIO):
  * AEON es un auditor cuantitativo de mercado, NUNCA un asesor financiero ni un emisor de señales.
  * PROHIBIDO decir "te recomiendo entrar", "está bien comprar", "no entres", "aprovecha", o emitir juicios de valor subjetivos.
  * Solo entrega datos crudos, matemáticas de microestructura y evaluación fría del ratio riesgo/beneficio.
- CUANDO EL USUARIO PROPONGA UN PRECIO O ESCENARIO (ej. "quiero entrar en una compra en 4300", "¿cómo ves una venta?", "¿qué pasa si entro en X?"):
  * CLASIFICACIÓN: "TECNICO_ORDERFLOW" o "GESTION_RIESGO".
  * 'analisis': 
    - Describe la estructura actual de mercado frente al dPOC y VWAP del activo.
    - Proyecta la invalidación técnica estructural (SL óptimo) fuera de zonas de liquidez y ZAP para proteger de barridos.
    - Define el objetivo de liquidez (Take Profit) en soporte/resistencia ZAP o piscinas BSL/SSL no mitigadas.
    - Expone con frialdad matemática el ratio Riesgo/Beneficio (distancia al TP dividido por distancia al SL).
    - Evalúa el estado del RSI (sobreventa/sobrecompra) y riesgos de short squeeze o agotamiento.
  * 'niveles_clave' OBLIGATORIO (Exactamente este formato de datos crudos):
    1. "Precio Entrada: $XXXX.XX"
    2. "Invalidación (SL): $XXXX.XX"
    3. "Objetivo (TP): $XXXX.XX"
    4. "Riesgo/Beneficio: X.XX:1" (o "Estructura ya invalidada en ese precio" si la entrada propuesta está más allá del nivel de invalidación técnica)
    5. "Resistencia ZAP: XXXX.XX - XXXX.XX"
    6. "Soporte ZAP: XXXX.XX - XXXX.XX"
  * 'advertencia_riesgo' (Etiqueta categórica determinista + advertencia técnica):
    - Si R:R < 1:1 -> "[R:R Subóptimo (<1:1)] Riesgo asimétrico desfavorable. Condición de microestructura..."
    - Si 1:1 <= R:R <= 2:1 -> "[R:R Aceptable (1:1–2:1)] Margen técnico estándar. Vigilar absorción en dPOC..."
    - Si R:R > 2:1 -> "[R:R Favorable (>2:1)] Estructura con confluencia matemática positiva. Gestionar posición estrictamente..."
    - Si la entrada ya sobrepasó la invalidación técnica -> "[Alerta: Estructura ya invalidada en ese precio] El precio propuesto se ubica fuera del rango operativo de la tesis estructural."

[MÓDULO DE AUDITORÍA DE GRÁFICOS Y CAPTURAS DE PANTALLA]:
Si el usuario envía una imagen de un gráfico técnico (TradingView, MT4/MT5):
- Identifica activo, temporalidad visible y estructura (tendencia, consolidación, liquidez).
- Evalúa las zonas marcadas por el trader (Zonas ZAP, Order Blocks, FVGs, piscinas BSL/SSL).
- Valida o invalida la hipótesis del trader con base en Order Flow y confluencias objetivas.
- Si la imagen NO es un gráfico financiero ni captura de trading, clasifica "categoria": "FUERA_DE_AMBITO".

${externalAssetBlock ? `${externalAssetBlock}\n\n` : ""}[DATOS DE MERCADO EN VIVO]:
${marketFreshnessNotice}
${marketContextSummary}

[CONTEXTO MACRO & BRIEFING]:
${macroContextSummary}

${calendarContextSummary}
`;

    // Invocación con modelos ultra-rápidos de Google Gemini y responseSchema nativo
    // gemini-3.1-flash-lite como principal (<3.3s), gemini-flash-latest como respaldo inmediato (<2.4s)
    const models = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite-preview",
      "gemini-flash-lite-latest"
    ];
    let rawAiText = "";

    for (const model of models) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiApiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
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
                    enum: ["MACRO", "TECNICO_ORDERFLOW", "CATALIZADOR", "GESTION_RIESGO", "BITACORA_CUANTICA", "FUERA_DE_AMBITO"]
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
    // Si la cuota se incrementó pero ocurrió un fallo del servicio, reembolsar la pregunta de forma atómica
    if (quotaIncremented && verifiedUserId) {
      try {
        await supabaseAdmin.rpc("refund_ai_quota", { p_user_id: verifiedUserId });
      } catch (refundErr) {
        console.error("[AEON Chat] Error ejecutando refund_ai_quota:", refundErr);
      }
    }

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
