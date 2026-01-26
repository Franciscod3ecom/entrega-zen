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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ml_user_id } = await req.json();

    if (!ml_user_id) {
      return new Response(
        JSON.stringify({ error: 'ml_user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar dados da conta ML
    const { data: account, error: accountError } = await supabase
      .from('ml_accounts')
      .select('id, owner_user_id, ml_user_id')
      .eq('ml_user_id', ml_user_id)
      .single();

    if (accountError || !account) {
      throw new Error('Conta ML não encontrada');
    }

    console.log('Iniciando sincronização para ML user:', ml_user_id);

    let imported = 0;
    let errors = 0;
    let offset = 0;
    const limit = 50;

    // Buscar pedidos em lotes
    while (true) {
      try {
        // Buscar pedidos pagos com envio
        const ordersResponse = await mlGet('/orders/search', {
          seller: ml_user_id.toString(),
          'order.status': 'paid',
          offset: offset.toString(),
          limit: limit.toString(),
        }, ml_user_id);

        const orders = ordersResponse.results || [];
        
        if (orders.length === 0) {
          console.log('Nenhum pedido adicional encontrado');
          break;
        }

        console.log(`Processando lote de ${orders.length} pedidos (offset: ${offset})`);

        // Processar cada pedido
        for (const orderSummary of orders) {
          try {
            // Buscar detalhes completos do pedido
            const orderData = await mlGet(`/orders/${orderSummary.id}`, {}, ml_user_id);
            
            // Rate limiting (10 req/s = 100ms entre chamadas)
            await new Promise(r => setTimeout(r, 100));

            // Se houver shipping, processar
            if (orderData.shipping?.id) {
              const shipmentId = orderData.shipping.id.toString();

              // Buscar dados do shipment para ter informações completas
              const shipmentData = await mlGet(`/shipments/${shipmentId}`, {}, ml_user_id);
              
              await new Promise(r => setTimeout(r, 100));

              // ⚡ FILTRO FLEX: Apenas importar envios do tipo self_service (Flex)
              const logisticType = shipmentData.logistic_type;
              if (logisticType !== 'self_service') {
                console.log(`⏭️ Shipment ${shipmentId} ignorado (logistic_type: ${logisticType})`);
                continue;
              }

              // Enriquecer com dados do comprador
              shipmentData.buyer_info = {
                name: `${orderData.buyer?.first_name || ''} ${orderData.buyer?.last_name || ''}`.trim(),
                nickname: orderData.buyer?.nickname || null,
                city: orderData.shipping?.receiver_address?.city?.name || null,
                state: orderData.shipping?.receiver_address?.state?.name || null,
              };

              // Salvar no cache
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
                  raw_data: shipmentData,
                }, {
                  onConflict: 'shipment_id,owner_user_id',
                });

              if (cacheError) {
                console.error('Erro ao salvar shipment:', shipmentId, cacheError);
                errors++;
              } else {
                imported++;
                console.log(`✅ Shipment FLEX ${shipmentId} importado (${imported})`);
              }
            }
          } catch (orderError: any) {
            console.error('Erro ao processar pedido:', orderSummary.id, orderError.message);
            errors++;
          }
        }

        offset += limit;

        // Limite de segurança: não processar mais de 200 pedidos por vez
        if (offset >= 200) {
          console.log('Limite de 200 pedidos atingido. Execute novamente se necessário.');
          break;
        }
      } catch (searchError: any) {
        console.error('Erro na busca de pedidos:', searchError);
        break;
      }
    }

    console.log(`Sincronização concluída: ${imported} importados, ${errors} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported, 
        errors,
        message: `${imported} envios importados com sucesso` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro em sync-orders-initial:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
