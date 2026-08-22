/* ============================================================
   AEON · Supabase Edge Function: TwelveData Proxy
   ============================================================ */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TWELVEDATA_API_KEY');
    if (!apiKey) {
      throw new Error('Falta TWELVEDATA_API_KEY en las variables del servidor.');
    }

    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol') || 'XAU/USD,EUR/USD,SPX,IXIC,DJI';
    const interval = url.searchParams.get('interval') || '1day';

    const apiUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`TwelveData respondió con estado ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
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
