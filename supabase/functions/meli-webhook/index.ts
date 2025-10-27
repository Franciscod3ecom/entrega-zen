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
    const { topic, resource, user_id } = body;

    console.log(`Processando webhook - Tópico: ${topic}, Resource: ${resource}, User ID: ${user_id}`);

    if (!user_id) {
      console.error('user_id não fornecido no webhook. Payload:', body);
      return;
    }

    // Buscar owner_user_id e ml_account_id baseado no ml_user_id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: account, error } = await supabase
      .from('ml_accounts')
      .select('id, owner_user_id, ml_user_id')
      .eq('ml_user_id', user_id)
      .maybeSingle();

    if (error || !account) {
      console.error('Conta ML não encontrada para user_id:', user_id, error);
      return;
    }

    const ownerUserId = account.owner_user_id;
    const mlUserId = account.ml_user_id;
    const mlAccountId = account.id;
    console.log('Usuário identificado:', ownerUserId, 'ML User:', mlUserId);

    if (topic === 'shipments') {
      await processShipment(resource, ownerUserId, mlUserId, mlAccountId);
    } else if (topic === 'orders' || topic === 'marketplace_orders') {
      await processOrder(resource, ownerUserId, mlUserId, mlAccountId);
    } else if (topic === 'flex_handshakes') {
      await processFlexHandshake(resource, ownerUserId, mlUserId, mlAccountId);
    }

    console.log('Webhook processado com sucesso para usuário:', ownerUserId);
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    throw error;
  }
}

async function processShipment(resource: string, ownerUserId: string, mlUserId: number, mlAccountId: string) {
  try {
    // Extrair shipment_id do resource (/shipments/123456)
    const shipmentId = resource.split('/').pop();
    
    if (!shipmentId) {
      console.error('shipment_id não encontrado no resource:', resource);
      return;
    }

    console.log('Buscando shipment:', shipmentId, 'para usuário:', ownerUserId, 'ml_user:', mlUserId);
    const shipmentData = await mlGet(`/shipments/${shipmentId}`, {}, mlUserId);

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
        owner_user_id: ownerUserId,
        ml_account_id: mlAccountId,
      }, {
        onConflict: 'shipment_id',
      });

    console.log('Shipment cacheado:', shipmentId, 'para usuário:', ownerUserId);

    // FASE 2: Detectar not_delivered e criar alerta
    if (shipmentData.status === 'not_delivered') {
      console.log('Shipment não entregue detectado:', shipmentId);
      
      // Buscar assignment do motorista
      const { data: assignment } = await supabase
        .from('driver_assignments')
        .select('*, drivers!inner(*, carrier_id)')
        .eq('shipment_id', shipmentId.toString())
        .eq('owner_user_id', ownerUserId)
        .is('returned_at', null)
        .maybeSingle();

      if (assignment) {
        console.log('Criando alerta para shipment não entregue:', shipmentId);
        await supabase.from('shipment_alerts').upsert({
          owner_user_id: ownerUserId,
          ml_account_id: mlAccountId,
          shipment_id: shipmentId.toString(),
          driver_id: assignment.driver_id,
          carrier_id: assignment.drivers?.carrier_id || null,
          alert_type: 'not_delivered_awaiting_return',
          status: 'pending',
          notes: `Status: ${shipmentData.status}, Substatus: ${shipmentData.substatus || 'N/A'}`,
          detected_at: new Date().toISOString()
        }, {
          onConflict: 'shipment_id',
          ignoreDuplicates: false
        });
      }
    }
  } catch (error: any) {
    console.error('Erro ao processar shipment:', error);
    throw error;
  }
}

async function processOrder(resource: string, ownerUserId: string, mlUserId: number, mlAccountId: string) {
  try {
    // Extrair order_id do resource (/orders/123456)
    const orderId = resource.split('/').pop();
    
    if (!orderId) {
      console.error('order_id não encontrado no resource:', resource);
      return;
    }

    console.log('Buscando order:', orderId, 'para usuário:', ownerUserId, 'ml_user:', mlUserId);
    const orderData = await mlGet(`/orders/${orderId}`, {}, mlUserId);

    // Se o order tem pack_id, processar todos os orders do pack
    if (orderData.pack_id) {
      console.log('Order pertence ao pack:', orderData.pack_id);
      const packData = await mlGet(`/packs/${orderData.pack_id}`, {}, mlUserId);
      
      // Processar shipments de todos os orders do pack
      for (const order of packData.orders || []) {
        if (order.shipping?.id) {
          await processShipment(`/shipments/${order.shipping.id}`, ownerUserId, mlUserId, mlAccountId);
        }
      }
    } else if (orderData.shipping?.id) {
      // Order individual com shipment
      await processShipment(`/shipments/${orderData.shipping.id}`, ownerUserId, mlUserId, mlAccountId);
    }

    console.log('Order processado:', orderId, 'para usuário:', ownerUserId);
  } catch (error: any) {
    console.error('Erro ao processar order:', error);
    throw error;
  }
}

// FASE 4: Processar handshakes do Flex (transferências entre entregadores)
async function processFlexHandshake(resource: string, ownerUserId: string, mlUserId: number, mlAccountId: string) {
  try {
    console.log('Processando flex handshake:', resource, 'para usuário:', ownerUserId);
    const handshakeData = await mlGet(resource, {}, mlUserId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    await supabase.from('flex_handshake_logs').insert({
      owner_user_id: ownerUserId,
      ml_account_id: mlAccountId,
      shipment_id: handshakeData.shipment_id?.toString() || null,
      from_driver: handshakeData.from_driver || null,
      to_driver: handshakeData.to_driver || null,
      handshake_time: handshakeData.timestamp || new Date().toISOString(),
      raw_data: handshakeData
    });

    console.log('Flex handshake registrado:', handshakeData.shipment_id);
  } catch (error: any) {
    console.error('Erro ao processar flex handshake:', error);
    throw error;
  }
}
