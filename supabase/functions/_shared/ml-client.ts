import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID')!;
const ML_CLIENT_SECRET = Deno.env.get('ML_CLIENT_SECRET')!;
const ML_BASE_URL = 'https://api.mercadolibre.com';

interface MLToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  ml_user_id: number;
  site_id: string;
  tenant_id: string;
}

export async function getValidToken(tenantId: string, mlUserId?: number): Promise<MLToken> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  let query = supabase
    .from('ml_accounts')
    .select('*')
    .eq('tenant_id', tenantId);
  
  if (mlUserId) {
    query = query.eq('ml_user_id', mlUserId);
  }
  
  const { data: account, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !account) {
    throw new Error('Nenhuma conta ML encontrada para este tenant. Configure a integração primeiro.');
  }

  const expiresAt = new Date(account.expires_at);
  const now = new Date();
  
  // Se o token expira em menos de 5 minutos, renovar
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expirando em breve, renovando...');
    return await refreshToken(account.refresh_token, account.site_id, account.ml_user_id, account.tenant_id);
  }

  return {
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
    ml_user_id: account.ml_user_id,
    site_id: account.site_id,
    tenant_id: account.tenant_id,
  };
}

async function refreshToken(refreshToken: string, siteId: string, mlUserId: number, tenantId: string): Promise<MLToken> {
  const response = await fetch(`${ML_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao renovar token ML: ${error}`);
  }

  const data = await response.json();
  
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  await supabase
    .from('ml_accounts')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('ml_user_id', mlUserId);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt.toISOString(),
    ml_user_id: mlUserId,
    site_id: siteId,
    tenant_id: tenantId,
  };
}

export async function mlGet(path: string, params: Record<string, string> = {}, tenantId?: string): Promise<any> {
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para chamadas ML');
  }
  const token = await getValidToken(tenantId);
  const url = new URL(`${ML_BASE_URL}${path}`);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'x-format-new': 'true',
        },
      });

      if (response.status === 429) {
        // Rate limit - aguardar e tentar novamente
        const retryAfter = parseInt(response.headers.get('retry-after') || '5');
        console.log(`Rate limited, aguardando ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        attempts++;
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ML API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) throw error;
      
      // Backoff exponencial
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
}

export async function mlPost(path: string, body: any, tenantId?: string): Promise<any> {
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para chamadas ML');
  }
  const token = await getValidToken(tenantId);

  const response = await fetch(`${ML_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML API error: ${response.status} - ${error}`);
  }

  return await response.json();
}
