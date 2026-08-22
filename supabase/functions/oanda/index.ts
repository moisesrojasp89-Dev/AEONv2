/* ============================================================
   AEON · Supabase Edge Function: OANDA Live Pricing & Daily %
   ============================================================ */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const INSTRUMENTS = ['EUR_USD', 'XAU_USD', 'SPX500_USD', 'NAS100_USD', 'US30_USD'];

Deno.serve(async (req) => {
  // Manejar preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OANDA_ACCOUNT_ID = Deno.env.get('OANDA_ACCOUNT_ID');
    const OANDA_TOKEN = Deno.env.get('OANDA_TOKEN');

    if (!OANDA_ACCOUNT_ID || !OANDA_TOKEN) {
      throw new Error('Faltan credenciales de OANDA en el servidor.');
    }

    const authHeaders = {
      'Authorization': `Bearer ${OANDA_TOKEN}`,
      'Accept-Datetime-Format': 'UNIX',
    };

    // Consultamos precios actuales y velas diarias en paralelo para calcular la variación %
    const pricingUrl = `https://api-fxpractice.oanda.com/v3/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=${INSTRUMENTS.join(',')}`;

    const [pricingRes, ...candlesResults] = await Promise.all([
      fetch(pricingUrl, { headers: authHeaders }),
      ...INSTRUMENTS.map((inst) =>
        fetch(`https://api-fxpractice.oanda.com/v3/instruments/${inst}/candles?count=1&granularity=D&price=M`, {
          headers: authHeaders,
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      ),
    ]);

    if (!pricingRes.ok) {
      const errorText = await pricingRes.text();
      console.error('OANDA Pricing Error:', errorText);
      throw new Error(`OANDA respondió con estado ${pricingRes.status}`);
    }

    const pricingData = await pricingRes.json();

    // Calcular cambio porcentual diario respecto a la apertura (Open) de la sesión
    const changes: Record<string, number> = {};
    candlesResults.forEach((cData) => {
      if (cData && cData.instrument && Array.isArray(cData.candles) && cData.candles[0]) {
        const candle = cData.candles[0].mid;
        const open = parseFloat(candle.o);
        const close = parseFloat(candle.c);
        if (open > 0) {
          changes[cData.instrument] = parseFloat((((close - open) / open) * 100).toFixed(2));
        }
      }
    });

    const responsePayload = {
      time: pricingData.time,
      prices: pricingData.prices,
      changes,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
