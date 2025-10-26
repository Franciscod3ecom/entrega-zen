import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mlGet } from '../_shared/ml-client.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    // ACK 200 IMEDIATO - crítico!
    const body = await req.json();
    
    console.log('Webhook recebido:', body);

    // Processar assincronamente
    processWebhook(body).catch(error => {
      console.error('Erro no processamento assíncrono:', error);
    });

    // Retornar 200 imediatamente
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erro em meli-webhook:', error);
    // Mesmo em erro, retornar 200 para não reenviar
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function processWebhook(body: any) {
  try {
    const { topic, resource } = body;

    console.log(`Processando webhook - Tópico: ${topic}, Resource: ${resource}`);

    if (topic === 'shipments') {
      await processShipment(resource);
    } else if (topic === 'orders' || topic === 'marketplace_orders') {
      await processOrder(resource);
    }

    console.log('Webhook processado com sucesso');
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    throw error;
  }
}

async function processShipment(resource: string) {
  try {
    // Extrair shipment_id do resource (/shipments/123456)
    const shipmentId = resource.split('/').pop();
    
    if (!shipmentId) {
      console.error('shipment_id não encontrado no resource:', resource);
      return;
    }

    console.log('Buscando shipment:', shipmentId);
    const shipmentData = await mlGet(`/shipments/${shipmentId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    await supabase
      .from('shipments_cache')
      .upsert({
        shipment_id: shipmentId.toString(),
        order_id: shipmentData.order_id ? shipmentData.order_id.toString() : null,
        pack_id: shipmentData.pack_id ? shipmentData.pack_id.toString() : null,
        status: shipmentData.status || shipmentData.substatus || 'unknown',
        substatus: shipmentData.status_history?.substatus || null,
        tracking_number: shipmentData.tracking_number || null,
        last_ml_update: new Date().toISOString(),
        raw_data: shipmentData,
      }, {
        onConflict: 'shipment_id',
      });

    console.log('Shipment cacheado:', shipmentId);
  } catch (error: any) {
    console.error('Erro ao processar shipment:', error);
    throw error;
  }
}

async function processOrder(resource: string) {
  try {
    // Extrair order_id do resource (/orders/123456)
    const orderId = resource.split('/').pop();
    
    if (!orderId) {
      console.error('order_id não encontrado no resource:', resource);
      return;
    }

    console.log('Buscando order:', orderId);
    const orderData = await mlGet(`/orders/${orderId}`);

    // Se o order tem pack_id, processar todos os orders do pack
    if (orderData.pack_id) {
      console.log('Order pertence ao pack:', orderData.pack_id);
      const packData = await mlGet(`/packs/${orderData.pack_id}`);
      
      // Processar shipments de todos os orders do pack
      for (const order of packData.orders || []) {
        if (order.shipping?.id) {
          await processShipment(`/shipments/${order.shipping.id}`);
        }
      }
    } else if (orderData.shipping?.id) {
      // Order individual com shipment
      await processShipment(`/shipments/${orderData.shipping.id}`);
    }

    console.log('Order processado:', orderId);
  } catch (error: any) {
    console.error('Erro ao processar order:', error);
    throw error;
  }
}
