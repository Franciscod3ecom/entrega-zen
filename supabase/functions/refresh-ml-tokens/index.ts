import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID')!;
const ML_CLIENT_SECRET = Deno.env.get('ML_CLIENT_SECRET')!;
const ML_BASE_URL = 'https://api.mercadolibre.com';

interface RefreshResult {
  ml_user_id: number;
  nickname: string;
  success: boolean;
  error?: string;
  new_expires_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results: RefreshResult[] = [];
  
  try {
    console.log('🔄 Iniciando refresh automático de tokens ML...');
    
    // Buscar todas as contas ML
    const { data: accounts, error: fetchError } = await supabase
      .from('ml_accounts')
      .select('*');

    if (fetchError) {
      throw new Error(`Erro ao buscar contas: ${fetchError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      console.log('ℹ️ Nenhuma conta ML encontrada');
      return new Response(
        JSON.stringify({ message: 'Nenhuma conta ML encontrada', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Encontradas ${accounts.length} contas ML para verificar`);
    
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const account of accounts) {
      const expiresAt = new Date(account.expires_at);
      const isExpiringSoon = expiresAt < twentyFourHoursFromNow;
      const isExpired = expiresAt < now;

      console.log(`\n👤 Conta: ${account.nickname} (ML ID: ${account.ml_user_id})`);
      console.log(`   Expira em: ${expiresAt.toISOString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRADO' : isExpiringSoon ? '⚠️ Expirando em breve' : '✅ Válido'}`);

      // Renovar apenas se expirando nas próximas 24h
      if (isExpiringSoon) {
        console.log(`   🔄 Tentando renovar token...`);
        
        try {
          const response = await fetch(`${ML_BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: ML_CLIENT_ID,
              client_secret: ML_CLIENT_SECRET,
              refresh_token: account.refresh_token,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText };
            }

            console.error(`   ❌ Erro ao renovar: ${JSON.stringify(errorData)}`);
            
            // Verificar se é erro de refresh token expirado
            const isInvalidGrant = 
              errorData.error === 'invalid_grant' || 
              errorData.message?.includes('invalid_grant') ||
              errorData.message?.includes('expired');

            if (isInvalidGrant) {
              // Marcar conta como precisando reconexão
              await supabase
                .from('ml_accounts')
                .update({
                  updated_at: new Date().toISOString(),
                })
                .eq('id', account.id);

              console.log(`   ⚠️ Refresh token expirado - conta precisa reconexão manual`);
            }

            results.push({
              ml_user_id: account.ml_user_id,
              nickname: account.nickname || 'N/A',
              success: false,
              error: isInvalidGrant 
                ? 'Refresh token expirado - reconexão manual necessária' 
                : `Erro ML: ${response.status}`,
            });
            
            continue;
          }

          const tokenData = await response.json();
          const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

          // Atualizar tokens no banco
          const { error: updateError } = await supabase
            .from('ml_accounts')
            .update({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id);

          if (updateError) {
            throw new Error(`Erro ao salvar token: ${updateError.message}`);
          }

          console.log(`   ✅ Token renovado com sucesso! Nova expiração: ${newExpiresAt.toISOString()}`);
          
          results.push({
            ml_user_id: account.ml_user_id,
            nickname: account.nickname || 'N/A',
            success: true,
            new_expires_at: newExpiresAt.toISOString(),
          });

        } catch (refreshError: any) {
          console.error(`   ❌ Exceção ao renovar: ${refreshError.message}`);
          results.push({
            ml_user_id: account.ml_user_id,
            nickname: account.nickname || 'N/A',
            success: false,
            error: refreshError.message,
          });
        }
      } else {
        console.log(`   ⏭️ Token ainda válido, não precisa renovar`);
        results.push({
          ml_user_id: account.ml_user_id,
          nickname: account.nickname || 'N/A',
          success: true,
          new_expires_at: expiresAt.toISOString(),
        });
      }
    }

    // Resumo
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Resumo: ${successCount} sucesso, ${failCount} falhas`);

    return new Response(
      JSON.stringify({
        message: `Processadas ${accounts.length} contas`,
        summary: { success: successCount, failed: failCount },
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral no refresh de tokens:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        results,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
