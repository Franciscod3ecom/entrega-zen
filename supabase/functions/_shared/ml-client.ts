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
  owner_user_id: string;
}

// ============= RATE LIMITING =============
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimiter.get(key);
  
  if (!record || record.resetAt < now) {
    rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

// ============= ERROR SANITIZATION =============
interface SanitizedError {
  message: string;
  logDetails: string;
}

export function sanitizeMLError(status: number, internalError: string): SanitizedError {
  // User-facing messages (generic, no internal details)
  const userMessages: Record<number, string> = {
    400: 'Requisição inválida. Verifique os dados enviados.',
    401: 'Erro de autenticação. Reconecte sua conta do Mercado Livre.',
    403: 'Acesso negado. Verifique as permissões da conta.',
    404: 'Recurso não encontrado.',
    429: 'Muitas requisições. Aguarde alguns instantes e tente novamente.',
    500: 'Erro temporário no serviço. Tente novamente em instantes.',
    502: 'Serviço temporariamente indisponível.',
    503: 'Serviço temporariamente indisponível.',
  };
  
  return {
    message: userMessages[status] || 'Erro ao processar requisição. Tente novamente.',
    logDetails: `[ML API Error ${status}] ${internalError}`,
  };
}

export async function getValidToken(mlUserId: number): Promise<MLToken> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  if (!mlUserId) {
    throw new Error('ml_user_id é obrigatório. Especifique qual conta ML usar.');
  }
  
  const { data: account, error } = await supabase
    .from('ml_accounts')
    .select('*')
    .eq('ml_user_id', Number(mlUserId))
    .maybeSingle();

  if (error || !account) {
    throw new Error(`Nenhuma conta ML encontrada para user ${mlUserId}`);
  }

  const expiresAt = new Date(account.expires_at);
  const now = new Date();
  
  // Se o token expira em menos de 5 minutos, renovar
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expirando em breve, renovando...');
    return await refreshToken(account.refresh_token, account.site_id, account.ml_user_id, account.owner_user_id);
  }

  return {
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
    ml_user_id: account.ml_user_id,
    site_id: account.site_id,
    owner_user_id: account.owner_user_id,
  };
}

async function refreshToken(refreshTokenStr: string, siteId: string, mlUserId: number, ownerUserId: string): Promise<MLToken> {
  console.log(`🔄 Iniciando refresh de token para ML user ${mlUserId}...`);
  
  const response = await fetch(`${ML_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Log full error server-side only
    console.error(`[ML Token Refresh Error ${response.status}] ${errorText}`);
    
    // Check for expired refresh token
    const isInvalidGrant = 
      errorText.includes('invalid_grant') || 
      errorText.includes('expired') ||
      errorText.includes('Invalid refresh token');

    if (isInvalidGrant) {
      console.error(`⚠️ Refresh token expirado para ML user ${mlUserId} - reconexão manual necessária`);
      // User-facing message without internal details
      throw new Error('Sessão expirada. Reconecte sua conta do Mercado Livre em Configurações.');
    }
    
    // Generic error for client, detailed log kept server-side
    const { message } = sanitizeMLError(response.status, errorText);
    throw new Error(message);
  }

  const data = await response.json();
  
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { error: updateError } = await supabase
    .from('ml_accounts')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('owner_user_id', ownerUserId)
    .eq('ml_user_id', mlUserId);

  if (updateError) {
    console.error(`[DB Error] Erro ao salvar token renovado: ${updateError.message}`);
  } else {
    console.log(`✅ Token renovado com sucesso para ML user ${mlUserId}, expira em: ${expiresAt.toISOString()}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt.toISOString(),
    ml_user_id: mlUserId,
    site_id: siteId,
    owner_user_id: ownerUserId,
  };
}

export async function mlGet(path: string, params: Record<string, string> = {}, mlUserId: number): Promise<any> {
  if (!mlUserId) {
    throw new Error('ml_user_id é obrigatório para chamadas ML');
  }
  
  let token = await getValidToken(mlUserId);
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

      // 401 - Token inválido, tentar renovar
      if (response.status === 401) {
        console.log(`Token inválido (401), forçando renovação...`);
        // Forçar renovação do token
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: account } = await supabase
          .from('ml_accounts')
          .select('*')
          .eq('ml_user_id', Number(mlUserId))
          .maybeSingle();
        
        if (account) {
          token = await refreshToken(account.refresh_token, account.site_id, account.ml_user_id, account.owner_user_id);
          attempts++;
          continue;
        }
        // Generic message for client
        throw new Error('Erro de autenticação. Reconecte sua conta do Mercado Livre.');
      }

      if (!response.ok) {
        const rawError = await response.text();
        // Log full details server-side
        console.error(`[ML API Error ${response.status}] ${path} - ${rawError}`);
        // Return sanitized error to client
        const { message } = sanitizeMLError(response.status, rawError);
        throw new Error(message);
      }

      return await response.json();
    } catch (error: any) {
      attempts++;
      if (attempts >= maxAttempts) throw error;
      
      // Backoff exponencial
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
}

export async function mlPost(path: string, body: any, mlUserId: number): Promise<any> {
  if (!mlUserId) {
    throw new Error('ml_user_id é obrigatório para chamadas ML');
  }
  const token = await getValidToken(mlUserId);

  const response = await fetch(`${ML_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const rawError = await response.text();
    // Log full details server-side
    console.error(`[ML API Error ${response.status}] POST ${path} - ${rawError}`);
    // Return sanitized error to client
    const { message } = sanitizeMLError(response.status, rawError);
    throw new Error(message);
  }

  return await response.json();
}

// FASE 5: Obter assignment do Flex (transportadora atribuída)
export async function getShipmentAssignment(shipmentId: string, siteId: string, mlUserId: number): Promise<any> {
  try {
    const path = `/flex/sites/${siteId}/shipments/${shipmentId}/assignment/v2`;
    return await mlGet(path, {}, mlUserId);
  } catch (error: any) {
    // Log details server-side only
    console.error(`[Assignment Error] shipment ${shipmentId}: ${error.message}`);
    return null;
  }
}
