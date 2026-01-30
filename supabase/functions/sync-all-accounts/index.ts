import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mlGet } from '../_shared/ml-client.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const days_back = Math.min(body.days_back || 7, 30); // FASE 3: Limite de 7 dias
    
    console.log(`[sync-all-accounts] Iniciando sincronização (últimos ${days_back} dias)`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar todas as contas ML
    const { data: accounts, error: accountsError } = await supabase
      .from('ml_accounts')
      .select('id, ml_user_id, owner_user_id, nickname');

    if (accountsError) {
      throw new Error(`Erro ao buscar contas: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma conta ML configurada', imported: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-all-accounts] Processando ${accounts.length} contas ML`);

    let totalImported = 0;
    let totalErrors = 0;
    const results: Array<{ account: string; imported: number; errors: number }> = [];

    for (const account of accounts) {
      console.log(`[sync-all-accounts] Processando conta: ${account.nickname || account.ml_user_id}`);
      
      let imported = 0;
      let errors = 0;
      let offset = 0;
      const limit = 50;

      try {
        // FASE 3: Calcular data limite
        const now = new Date();
        const dateFrom = new Date(now.getTime() - days_back * 24 * 60 * 60 * 1000);
        const dateFromStr = dateFrom.toISOString().split('T')[0];
        
        while (true) {
          const ordersResponse = await mlGet('/orders/search', {
            seller: account.ml_user_id.toString(),
            'order.status': 'paid',
            'order.date_created.from': `${dateFromStr}T00:00:00.000-03:00`,
            offset: offset.toString(),
            limit: limit.toString(),
          }, account.ml_user_id);

          const orders = ordersResponse.results || [];
          
          if (orders.length === 0) {
            break;
          }

          console.log(`[sync-all-accounts] Conta ${account.nickname}: lote ${offset} - ${orders.length} pedidos`);

          for (const orderSummary of orders) {
            try {
              const orderData = await mlGet(`/orders/${orderSummary.id}`, {}, account.ml_user_id);
              await new Promise(r => setTimeout(r, 100));

              if (orderData.shipping?.id) {
                const shipmentId = orderData.shipping.id.toString();
                const shipmentData = await mlGet(`/shipments/${shipmentId}`, {}, account.ml_user_id);
                await new Promise(r => setTimeout(r, 100));

                // ⚡ FILTRO FLEX: Apenas importar envios do tipo self_service (Flex)
                // O campo está em logistic.type (não no nível raiz)
                const logisticType = shipmentData.logistic?.type;
                if (logisticType !== 'self_service') {
                  console.log(`[sync-all-accounts] ⏭️ Shipment ${shipmentId} ignorado (logistic.type: ${logisticType})`);
                  continue;
                }

                // FASE 1: Criar dados slim
                const buyerInfo = {
                  name: `${orderData.buyer?.first_name || ''} ${orderData.buyer?.last_name || ''}`.trim(),
                  nickname: orderData.buyer?.nickname || null,
                  city: orderData.shipping?.receiver_address?.city?.name || null,
                  state: orderData.shipping?.receiver_address?.state?.name || null,
                };
                
                const slimRawData = {
                  id: shipmentData.id,
                  status: shipmentData.status,
                  substatus: shipmentData.substatus,
                  logistic: { type: shipmentData.logistic?.type, mode: shipmentData.logistic?.mode },
                  buyer_info: buyerInfo,
                  tracking_number: shipmentData.tracking_number,
                };

                const { error: cacheError } = await supabase
                  .from('shipments_cache')
                  .upsert({
                    shipment_id: shipmentId,
                    order_id: orderData.id.toString(),
                    pack_id: orderData.pack_id?.toString() || null,
                    status: shipmentData.status,
                    substatus: shipmentData.substatus || null,
                    tracking_number: shipmentData.tracking_number || null,
                    last_ml_update: new Date().toISOString(),
                    owner_user_id: account.owner_user_id,
                    ml_account_id: account.id,
                    cliente_nome: buyerInfo.name || null,
                    cidade: buyerInfo.city || null,
                    estado: buyerInfo.state || null,
                    raw_data: slimRawData,
                  }, {
                    onConflict: 'shipment_id,owner_user_id',
                  });

                if (cacheError) {
                  errors++;
                } else {
                  imported++;
                  console.log(`[sync-all-accounts] ✅ Shipment FLEX ${shipmentId} importado`);
                }
              }
            } catch (orderError: any) {
              console.error(`[sync-all-accounts] Erro pedido ${orderSummary.id}:`, orderError.message);
              errors++;
            }
          }

          offset += limit;

          // Limite de segurança por conta
          if (offset >= 300) {
            console.log(`[sync-all-accounts] Limite por conta atingido (300 pedidos)`);
            break;
          }
        }
      } catch (accountError: any) {
        console.error(`[sync-all-accounts] Erro conta ${account.ml_user_id}:`, accountError.message);
        errors++;
      }

      results.push({
        account: account.nickname || account.ml_user_id.toString(),
        imported,
        errors,
      });

      totalImported += imported;
      totalErrors += errors;
    }

    console.log(`[sync-all-accounts] Concluído: ${totalImported} importados, ${totalErrors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: totalImported,
        errors: totalErrors,
        accounts: results,
        message: `${totalImported} envios importados de ${accounts.length} contas`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[sync-all-accounts] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
