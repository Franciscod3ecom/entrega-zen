import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID')!;
const ML_REDIRECT_URI = Deno.env.get('ML_REDIRECT_URI')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando OAuth ML...');
    
    // Obter tenant_id do body
    const { tenant_id } = await req.json();
    
    if (!tenant_id) {
      throw new Error('tenant_id é obrigatório');
    }
    
    // Criar state com tenant_id e nonce para segurança
    const state = btoa(JSON.stringify({
      tenant_id,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 10 * 60 * 1000, // 10 minutos
    }));
    
    const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', ML_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', ML_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    
    console.log('URL de autorização gerada:', authUrl.toString());

    return new Response(
      JSON.stringify({ authorization_url: authUrl.toString() }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro em meli-auth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
