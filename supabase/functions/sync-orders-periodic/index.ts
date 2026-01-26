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
    console.log('[sync-orders-periodic] Iniciando sincronização periódica');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar todas as contas ML ativas
    const { data: accounts, error: accountsError } = await supabase
      .from('ml_accounts')
      .select('id, ml_user_id, owner_user_id, nickname');

    if (accountsError) {
      throw new Error(`Erro ao buscar contas ML: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      console.log('[sync-orders-periodic] Nenhuma conta ML encontrada');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma conta ML configurada', imported: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-orders-periodic] Processando ${accounts.length} contas ML`);

    let totalImported = 0;
    let totalErrors = 0;
    const accountResults: Array<{ account: string; imported: number; errors: number }> = [];

    for (const account of accounts) {
      console.log(`[sync-orders-periodic] Processando conta: ${account.nickname || account.ml_user_id}`);
      
      let imported = 0;
      let errors = 0;

      try {
        // Buscar pedidos das últimas 48h com status paid
        const now = new Date();
        const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const dateFrom = hours48Ago.toISOString().split('T')[0];

        const ordersResponse = await mlGet('/orders/search', {
          seller: account.ml_user_id.toString(),
          'order.status': 'paid',
          'order.date_created.from': `${dateFrom}T00:00:00.000-03:00`,
          limit: '50',
        }, account.ml_user_id);

        const orders = ordersResponse.results || [];
        console.log(`[sync-orders-periodic] Conta ${account.nickname}: ${orders.length} pedidos recentes`);

        for (const orderSummary of orders) {
          try {
            // Buscar detalhes do pedido
            const orderData = await mlGet(`/orders/${orderSummary.id}`, {}, account.ml_user_id);
            await new Promise(r => setTimeout(r, 100)); // Rate limit

            if (orderData.shipping?.id) {
              const shipmentId = orderData.shipping.id.toString();

              // Buscar dados atualizados do shipment
              const shipmentData = await mlGet(`/shipments/${shipmentId}`, {}, account.ml_user_id);
              await new Promise(r => setTimeout(r, 100));

              // ⚡ FILTRO FLEX: Apenas importar envios do tipo self_service (Flex)
              // O campo está em logistic.type (não no nível raiz)
              const logisticType = shipmentData.logistic?.type;
              if (logisticType !== 'self_service') {
                console.log(`[sync-orders-periodic] ⏭️ Shipment ${shipmentId} ignorado (logistic.type: ${logisticType})`);
                continue;
              }

              // Verificar se já existe no cache
              const { data: existingShipment } = await supabase
                .from('shipments_cache')
                .select('shipment_id, status, tracking_number')
                .eq('shipment_id', shipmentId)
                .maybeSingle();

              // Enriquecer com dados do comprador
              shipmentData.buyer_info = {
                name: `${orderData.buyer?.first_name || ''} ${orderData.buyer?.last_name || ''}`.trim(),
                nickname: orderData.buyer?.nickname || null,
                city: orderData.shipping?.receiver_address?.city?.name || null,
                state: orderData.shipping?.receiver_address?.state?.name || null,
              };

              // Upsert no cache
              const { error: cacheError } = await supabase
                .from('shipments_cache')
                .upsert({
                  shipment_id: shipmentId,
                  order_id: orderData.id.toString(),
                  pack_id: orderData.pack_id?.toString() || null,
                  status: shipmentData.status,
                  substatus: shipmentData.substatus || null,
                  tracking_number: shipmentData.tracking_number || existingShipment?.tracking_number || null,
                  last_ml_update: new Date().toISOString(),
                  owner_user_id: account.owner_user_id,
                  ml_account_id: account.id,
                  raw_data: shipmentData,
                }, {
                  onConflict: 'shipment_id,owner_user_id',
                });

              if (cacheError) {
                console.error(`[sync-orders-periodic] Erro ao salvar ${shipmentId}:`, cacheError);
                errors++;
              } else {
                imported++;
                console.log(`[sync-orders-periodic] ✅ Shipment FLEX ${shipmentId} importado`);
              }
            }
          } catch (orderError: any) {
            console.error(`[sync-orders-periodic] Erro no pedido ${orderSummary.id}:`, orderError.message);
            errors++;
          }
        }
      } catch (accountError: any) {
        console.error(`[sync-orders-periodic] Erro na conta ${account.ml_user_id}:`, accountError.message);
        errors++;
      }

      accountResults.push({
        account: account.nickname || account.ml_user_id.toString(),
        imported,
        errors,
      });

      totalImported += imported;
      totalErrors += errors;
    }

    console.log(`[sync-orders-periodic] Concluído: ${totalImported} importados, ${totalErrors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: totalImported,
        errors: totalErrors,
        accounts: accountResults,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[sync-orders-periodic] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
