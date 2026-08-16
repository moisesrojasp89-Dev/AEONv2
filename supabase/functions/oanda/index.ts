import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Usamos el endpoint de 'pricing' de OANDA v20 REST API
    // Para cuentas Demo (Practice), la URL base es api-fxpractice.oanda.com
    const url = `https://api-fxpractice.oanda.com/v3/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=EUR_USD,XAU_USD,SPX500_USD,NAS100_USD,US30_USD`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${OANDA_TOKEN}`,
        'Accept-Datetime-Format': 'UNIX'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OANDA Error:', errorText);
      throw new Error(`OANDA respondió con estado ${response.status}`);
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
