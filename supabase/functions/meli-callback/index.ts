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
    console.log('Callback URL completa:', url.toString());
    console.log('Query params recebidos:', Object.fromEntries(url.searchParams.entries()));
    
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      console.error('Erro retornado pelo ML:', error, errorDescription);
      throw new Error(`Erro do Mercado Livre: ${error} - ${errorDescription}`);
    }

    if (!code || !stateParam) {
      console.error('Código ou state não recebido. Params:', Object.fromEntries(url.searchParams.entries()));
      throw new Error('Código de autorização ou state não fornecido pelo Mercado Livre');
    }

    // Validar state
    let state;
    try {
      state = JSON.parse(atob(stateParam));
      if (!state.tenant_id || !state.nonce) {
        throw new Error('State inválido');
      }
      if (Date.now() > state.exp) {
        throw new Error('State expirado');
      }
    } catch (e) {
      console.error('Erro ao validar state:', e);
      throw new Error('State inválido ou expirado');
    }

    console.log('Callback recebido com code:', code.substring(0, 10) + '...', 'tenant_id:', state.tenant_id);

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

    // Salvar tokens no banco com tenant_id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const { error: dbError } = await supabase
      .from('ml_accounts')
      .upsert({
        tenant_id: state.tenant_id,
        ml_user_id: tokenData.user_id,
        nickname: userData.nickname,
        site_id: userData.site_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'tenant_id,ml_user_id',
      });

    if (dbError) {
      console.error('Erro ao salvar token:', dbError);
      throw dbError;
    }

    console.log('Conta ML salva com sucesso no banco para tenant:', state.tenant_id);

    // Redirecionar para página de sucesso
    // Usar a URL do frontend configurada ou construir dinamicamente
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ae36497b-ab18-4e78-bc0b-f6436f4288a0.lovableproject.com';
    const redirectUrl = `${frontendUrl}/config-ml?ml_connected=true`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error: any) {
    console.error('Erro em meli-callback:', error);
    
    // Redirecionar para página de erro
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://ae36497b-ab18-4e78-bc0b-f6436f4288a0.lovableproject.com';
    const errorUrl = `${frontendUrl}/config-ml?ml_error=${encodeURIComponent(error.message)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': errorUrl,
      },
    });
  }
});
