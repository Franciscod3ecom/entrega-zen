import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mlGet } from '../_shared/ml-client.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ⚡ OTIMIZAÇÃO: Apenas processar estes tópicos (ignora items, questions, messages, etc.)
const ALLOWED_TOPICS = new Set(['shipments', 'orders', 'marketplace_orders', 'flex_handshakes']);

// 🔒 Rate limiting: evitar processar mesmo shipment múltiplas vezes em curto período
const recentlyProcessed = new Map<string, number>();
const DEDUP_WINDOW_MS = 30_000; // 30 segundos

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const lastProcessed = recentlyProcessed.get(key);
  
  // Limpar entradas antigas
  if (recentlyProcessed.size > 1000) {
    for (const [k, v] of recentlyProcessed) {
      if (now - v > DEDUP_WINDOW_MS) recentlyProcessed.delete(k);
    }
  }
  
  if (lastProcessed && now - lastProcessed < DEDUP_WINDOW_MS) {
    return true;
  }
  
  recentlyProcessed.set(key, now);
  return false;
}

serve(async (req) => {
  try {
    const rawBody = await req.text();
    
    // Parse do body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      // Body não é JSON válido - retornar 200 silenciosamente
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ⚡ OTIMIZAÇÃO 1: Rejeitar imediatamente tópicos não processados
    // Isso evita todo o processamento (busca no DB, chamadas API, etc.)
    if (!body.topic || !ALLOWED_TOPICS.has(body.topic)) {
      // Log mínimo para debug (sem processamento pesado)
      console.log(`[webhook] ⏭️ Tópico ignorado: ${body.topic || 'undefined'}`);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ⚡ OTIMIZAÇÃO 2: Deduplicação - evitar processar mesmo recurso múltiplas vezes
    const dedupKey = `${body.user_id}:${body.resource}`;
    if (isDuplicate(dedupKey)) {
      console.log(`[webhook] ⏭️ Dedup: ${body.resource} (processado recentemente)`);
      return new Response(JSON.stringify({ ok: true, deduplicated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[webhook] ✅ Processando:', { topic: body.topic, resource: body.resource, user_id: body.user_id });

    // Processar assincronamente (não bloquear resposta)
    processWebhook(body).catch(error => {
      console.error('[webhook] Erro no processamento:', error.message);
    });

    // Retornar 200 imediatamente (requisito do ML)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[webhook] Erro geral:', error.message);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function processWebhook(body: any) {
  try {
    const { topic, resource, user_id } = body;

    if (!user_id) {
      console.error('[webhook] user_id ausente');
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
      console.error('[webhook] Conta ML não encontrada:', user_id);
      return;
    }

    const ownerUserId = account.owner_user_id;
    const mlUserId = account.ml_user_id;
    const mlAccountId = account.id;

    if (topic === 'shipments') {
      await processShipment(resource, ownerUserId, mlUserId, mlAccountId);
    } else if (topic === 'orders' || topic === 'marketplace_orders') {
      await processOrder(resource, ownerUserId, mlUserId, mlAccountId);
    } else if (topic === 'flex_handshakes') {
      await processFlexHandshake(resource, ownerUserId, mlUserId, mlAccountId);
    }

    console.log('[webhook] ✅ Concluído:', resource);
  } catch (error: any) {
    console.error('[webhook] Erro ao processar:', error.message);
  }
}

async function processShipment(resource: string, ownerUserId: string, mlUserId: number, mlAccountId: string) {
  try {
    const shipmentId = resource.split('/').pop();
    if (!shipmentId) return;

    const shipmentData = await mlGet(`/shipments/${shipmentId}`, {}, mlUserId);

    // ⚡ FILTRO FLEX: Apenas processar envios do tipo self_service
    const logisticType = shipmentData.logistic?.type;
    if (logisticType !== 'self_service') {
      console.log(`[webhook] ⏭️ Shipment ${shipmentId} não é Flex (${logisticType})`);
      return;
    }

    // Enriquecer com dados do comprador (apenas se necessário)
    let buyerInfo = null;
    if (shipmentData.order_id) {
      try {
        const orderData = await mlGet(`/orders/${shipmentData.order_id}`, {}, mlUserId);
        buyerInfo = {
          name: `${orderData.buyer?.first_name || ''} ${orderData.buyer?.last_name || ''}`.trim(),
          nickname: orderData.buyer?.nickname || null,
          city: orderData.shipping?.receiver_address?.city?.name || null,
          state: orderData.shipping?.receiver_address?.state?.name || null,
        };
      } catch {
        // Ignorar erro de enriquecimento
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // ⚡ OTIMIZAÇÃO: Upsert minimalista - apenas campos essenciais
    await supabase
      .from('shipments_cache')
      .upsert({
        shipment_id: shipmentId.toString(),
        order_id: shipmentData.order_id?.toString() || null,
        pack_id: shipmentData.pack_id?.toString() || null,
        status: shipmentData.status || 'unknown',
        substatus: shipmentData.status_history?.substatus || null,
        tracking_number: shipmentData.tracking_number || null,
        last_ml_update: new Date().toISOString(),
        // ⚡ raw_data slim para economizar storage
        raw_data: {
          id: shipmentData.id,
          status: shipmentData.status,
          substatus: shipmentData.substatus,
          logistic: { type: shipmentData.logistic?.type, mode: shipmentData.logistic?.mode },
          buyer_info: buyerInfo,
          tracking_number: shipmentData.tracking_number,
        },
        owner_user_id: ownerUserId,
        ml_account_id: mlAccountId,
        cliente_nome: buyerInfo?.name || null,
        cidade: buyerInfo?.city || null,
        estado: buyerInfo?.state || null,
      }, {
        onConflict: 'shipment_id',
      });

    // Alertas automáticos
    if (shipmentData.status === 'not_delivered') {
      const { data: assignment } = await supabase
        .from('driver_assignments')
        .select('driver_id, drivers!inner(carrier_id)')
        .eq('shipment_id', shipmentId.toString())
        .eq('owner_user_id', ownerUserId)
        .is('returned_at', null)
        .maybeSingle();

      await supabase.from('shipment_alerts').upsert({
        owner_user_id: ownerUserId,
        ml_account_id: mlAccountId,
        shipment_id: shipmentId.toString(),
        driver_id: assignment?.driver_id || null,
        carrier_id: (assignment?.drivers as any)?.carrier_id || null,
        alert_type: 'not_delivered_awaiting_return',
        status: 'pending',
        notes: `Status: ${shipmentData.status}, Substatus: ${shipmentData.substatus || 'N/A'}`,
        detected_at: new Date().toISOString()
      }, {
        onConflict: 'owner_user_id,shipment_id,alert_type',
        ignoreDuplicates: false
      });
    }
    
    // Auto-resolver alertas quando entregue
    if (shipmentData.status === 'delivered') {
      await supabase
        .from('shipment_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          notes: 'Resolvido automaticamente - Entrega confirmada via webhook'
        })
        .eq('shipment_id', shipmentId.toString())
        .eq('status', 'pending');
    }
  } catch (error: any) {
    console.error('[webhook] Erro shipment:', error.message);
  }
}

async function processOrder(resource: string, ownerUserId: string, mlUserId: number, mlAccountId: string) {
  try {
    const orderId = resource.split('/').pop();
    if (!orderId) return;

    const orderData = await mlGet(`/orders/${orderId}`, {}, mlUserId);

    // Se o order tem pack_id, processar todos os orders do pack
    if (orderData.pack_id) {
      const packData = await mlGet(`/packs/${orderData.pack_id}`, {}, mlUserId);
      for (const order of packData.orders || []) {
        if (order.shipping?.id) {
          await processShipment(`/shipments/${order.shipping.id}`, ownerUserId, mlUserId, mlAccountId);
        }
      }
    } else if (orderData.shipping?.id) {
      await processShipment(`/shipments/${orderData.shipping.id}`, ownerUserId, mlUserId, mlAccountId);
    }
  } catch (error: any) {
    console.error('[webhook] Erro order:', error.message);
  }
}

async function processFlexHandshake(resource: string, ownerUserId: string, mlUserId: number, mlAccountId: string) {
  try {
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
  } catch (error: any) {
    console.error('[webhook] Erro handshake:', error.message);
  }
}
