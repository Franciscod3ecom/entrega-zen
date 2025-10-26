import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID')!;
const ML_CLIENT_SECRET = Deno.env.get('ML_CLIENT_SECRET')!;
const ML_REDIRECT_URI = Deno.env.get('ML_REDIRECT_URI')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error('Código de autorização não fornecido');
    }

    console.log('Callback recebido com code:', code.substring(0, 10) + '...');

    // Trocar code por access_token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code: code,
        redirect_uri: ML_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Erro ao trocar code por token:', error);
      throw new Error(`Erro ao obter token: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token obtido com sucesso. User ID:', tokenData.user_id);

    // Buscar informações do vendedor
    const userResponse = await fetch(`https://api.mercadolibre.com/users/${tokenData.user_id}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Erro ao buscar informações do usuário');
    }

    const userData = await userResponse.json();
    console.log('Dados do usuário obtidos:', userData.nickname);

    // Salvar tokens no banco
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const { error: dbError } = await supabase
      .from('ml_tokens')
      .upsert({
        site_id: userData.site_id,
        user_id: tokenData.user_id,
        seller_nickname: userData.nickname,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'site_id,user_id',
      });

    if (dbError) {
      console.error('Erro ao salvar token:', dbError);
      throw dbError;
    }

    console.log('Token salvo com sucesso no banco');

    // Redirecionar para página de sucesso
    const redirectUrl = `${url.origin}/dashboard?ml_connected=true`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error: any) {
    console.error('Erro em meli-callback:', error);
    
    // Redirecionar para página de erro
    const url = new URL(req.url);
    const errorUrl = `${url.origin}/dashboard?ml_error=${encodeURIComponent(error.message)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': errorUrl,
      },
    });
  }
});
