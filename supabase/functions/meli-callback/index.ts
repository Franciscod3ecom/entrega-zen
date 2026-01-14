import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID')!;
const ML_CLIENT_SECRET = Deno.env.get('ML_CLIENT_SECRET')!;
const ML_REDIRECT_URI = Deno.env.get('ML_REDIRECT_URI')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ParsedState = {
  owner_user_id: string;
  nonce: string;
  exp: number;
};

function parseState(stateParam: string): ParsedState {
  // 1) Formato JSON em base64 (legado)
  try {
    const decoded = atob(stateParam);
    const json = JSON.parse(decoded);
    if (json?.owner_user_id && json?.nonce && typeof json?.exp === 'number') {
      return json as ParsedState;
    }
  } catch {
    // ignore
  }

  // 2) Formato string "owner|nonce|exp" (fluxo atual do meli-auth)
  const parts = stateParam.split('|');
  if (parts.length === 3) {
    const [owner_user_id, nonce, expStr] = parts;
    const exp = Number(expStr);
    if (!owner_user_id || !nonce || !Number.isFinite(exp)) {
      throw new Error('State inválido');
    }
    return { owner_user_id, nonce, exp };
  }

  throw new Error('State inválido');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Ler parâmetros do callback (GET por padrão)
    let code = url.searchParams.get('code');
    let stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Alguns clientes podem chamar via POST
    if ((!code || !stateParam) && req.method === 'POST') {
      try {
        const body = await req.json();
        code = code || body?.code;
        stateParam = stateParam || body?.state;
      } catch {
        // ignore
      }
    }

    // Se alguém/bot chamar a URL sem params, não poluir logs com ERROR
    if (!code || !stateParam) {
      console.log('[meli-callback] Chamada sem code/state ignorada', {
        method: req.method,
        userAgent: req.headers.get('user-agent'),
      });
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    if (error) {
      console.error('[meli-callback] Erro retornado pelo Mercado Livre:', error, errorDescription);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `https://rastreioflex.lovable.app/config-ml?status=error&message=${encodeURIComponent(errorDescription || error)}`,
        },
      });
    }

    // Validar state (aceita 2 formatos)
    const state = parseState(stateParam);
    if (!state.owner_user_id || !state.nonce) {
      throw new Error('State inválido');
    }
    if (Date.now() > state.exp) {
      throw new Error('State expirado');
    }

    console.log('[meli-callback] Callback recebido', {
      owner_user_id: state.owner_user_id,
      codePrefix: code.substring(0, 10),
    });

    // Trocar code por access_token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: ML_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[meli-callback] Erro ao trocar code por token:', errText);
      throw new Error(`Erro ao obter token: ${errText}`);
    }

    const tokenData = await tokenResponse.json();

    // Buscar informações do vendedor
    const userResponse = await fetch(`https://api.mercadolibre.com/users/${tokenData.user_id}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Erro ao buscar informações do usuário');
    }

    const userData = await userResponse.json();

    // Salvar tokens no banco com owner_user_id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const { error: dbError } = await supabase
      .from('ml_accounts')
      .upsert(
        {
          owner_user_id: state.owner_user_id,
          ml_user_id: tokenData.user_id,
          nickname: userData.nickname,
          site_id: userData.site_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'owner_user_id,ml_user_id',
        }
      );

    if (dbError) {
      console.error('[meli-callback] Erro ao salvar token:', dbError);
      throw dbError;
    }

    console.log('[meli-callback] ✅ Conta ML vinculada com sucesso!', userData.nickname);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://rastreioflex.lovable.app/config-ml?status=success&nickname=${encodeURIComponent(userData.nickname)}`,
      },
    });
  } catch (error: any) {
    console.error('[meli-callback] Erro:', error);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://rastreioflex.lovable.app/config-ml?status=error&message=${encodeURIComponent(error.message)}`,
      },
    });
  }
});

