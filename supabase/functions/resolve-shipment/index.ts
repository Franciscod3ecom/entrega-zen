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
    const { input_id } = await req.json();

    if (!input_id) {
      throw new Error('input_id é obrigatório');
    }

    console.log('Resolvendo ID:', input_id);

    let shipmentData: any = null;
    let orderId: string | null = null;
    let packId: string | null = null;

    // Estratégia 1: Tentar como shipment_id direto
    try {
      console.log('Tentando como shipment_id...');
      shipmentData = await mlGet(`/shipments/${input_id}`);
      console.log('Sucesso! É um shipment_id');
      
      if (shipmentData.order_id) {
        orderId = shipmentData.order_id.toString();
      }
    } catch (error: any) {
      console.log('Não é shipment_id, tentando pack_id...');

      // Estratégia 2: Tentar como pack_id
      try {
        const packData = await mlGet(`/packs/${input_id}`);
        packId = input_id;
        console.log('Sucesso! É um pack_id com', packData.orders?.length || 0, 'orders');

        // Pegar o primeiro order do pack
        if (packData.orders && packData.orders.length > 0) {
          const firstOrder = packData.orders[0];
          orderId = firstOrder.id.toString();
          
          // Buscar shipment do order
          const orderData = await mlGet(`/orders/${orderId}`);
          
          if (orderData.shipping?.id) {
            shipmentData = await mlGet(`/shipments/${orderData.shipping.id}`);
            console.log('Shipment encontrado via pack/order');
          }
        }
      } catch (packError: any) {
        console.log('Não é pack_id, tentando order_id...');

        // Estratégia 3: Tentar como order_id
        try {
          const orderData = await mlGet(`/orders/${input_id}`);
          orderId = input_id;
          packId = orderData.pack_id ? orderData.pack_id.toString() : null;
          
          if (orderData.shipping?.id) {
            shipmentData = await mlGet(`/shipments/${orderData.shipping.id}`);
            console.log('Shipment encontrado via order');
          } else {
            throw new Error('Order não possui shipment associado');
          }
        } catch (orderError: any) {
          throw new Error(`ID inválido: não é shipment, pack ou order. Erro: ${orderError.message}`);
        }
      }
    }

    if (!shipmentData) {
      throw new Error('Não foi possível obter dados do shipment');
    }

    // Salvar no cache
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { error: cacheError } = await supabase
      .from('shipments_cache')
      .upsert({
        shipment_id: shipmentData.id.toString(),
        order_id: orderId,
        pack_id: packId,
        status: shipmentData.status || shipmentData.substatus || 'unknown',
        substatus: shipmentData.status_history?.substatus || null,
        tracking_number: shipmentData.tracking_number || null,
        last_ml_update: new Date().toISOString(),
        raw_data: shipmentData,
      }, {
        onConflict: 'shipment_id',
      });

    if (cacheError) {
      console.error('Erro ao salvar cache:', cacheError);
    }

    console.log('Shipment resolvido e cacheado com sucesso');

    return new Response(
      JSON.stringify({
        shipment_id: shipmentData.id.toString(),
        order_id: orderId,
        pack_id: packId,
        status: shipmentData.status || shipmentData.substatus,
        substatus: shipmentData.status_history?.substatus || null,
        tracking_number: shipmentData.tracking_number || null,
        raw_data: shipmentData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro em resolve-shipment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
