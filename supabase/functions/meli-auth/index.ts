import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID')!;
const ML_REDIRECT_URI = Deno.env.get('ML_REDIRECT_URI')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== INICIANDO OAUTH ML ===');
    
    // Validar configuração
    if (!ML_CLIENT_ID || !ML_REDIRECT_URI) {
      console.error('ERRO: Credenciais ML não configuradas!');
      console.error('ML_CLIENT_ID:', ML_CLIENT_ID ? 'OK' : 'FALTANDO');
      console.error('ML_REDIRECT_URI:', ML_REDIRECT_URI ? 'OK' : 'FALTANDO');
      throw new Error('Credenciais do Mercado Livre não configuradas no servidor');
    }
    
    console.log('ML_REDIRECT_URI configurado:', ML_REDIRECT_URI);
    
    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    
    let user;
    try {
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
      
      if (userErr) {
        console.error('ERRO ao obter usuário:', userErr);
        return new Response(
          JSON.stringify({ error: 'Erro de autenticação: ' + userErr.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }
      
      if (!authUser) {
        console.error('ERRO: nenhum usuário autenticado no token');
        return new Response(
          JSON.stringify({ error: 'Token de autenticação inválido ou expirado. Faça login novamente.' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }
      
      user = authUser;
    } catch (parseError: any) {
      console.error('ERRO ao fazer parse da resposta de autenticação:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao validar token de autenticação. Faça logout e login novamente.',
          details: parseError.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }
    
    console.log('Usuário autenticado:', user.id);
    
    // Criar state com owner_user_id e nonce para segurança
    const nonce = crypto.randomUUID();
    const exp = Date.now() + 10 * 60 * 1000; // 10 minutos
    const state = `${user.id}|${nonce}|${exp}`;
    
    console.log('State gerado:', {
      owner_user_id: user.id,
      nonce: nonce,
      expira_em: new Date(exp).toISOString()
    });
    
    const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', ML_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', ML_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    
    console.log('=== URL DE AUTORIZAÇÃO GERADA ===');
    console.log('URL completa:', authUrl.toString());
    console.log('Redirect URI usado:', ML_REDIRECT_URI);
    console.log('==================================');

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('=== ERRO EM MELI-AUTH ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
