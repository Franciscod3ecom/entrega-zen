import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { mlGet } from "../_shared/ml-client.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { driver_id, code, source = 'scanner' } = await req.json();

    if (!driver_id || !code) {
      throw new Error('driver_id e code são obrigatórios');
    }

    console.log(`[scan-bind] Processando código: ${code} para motorista: ${driver_id}`);

    // Estratégia de resolução:
    // 1. Tentar como shipment_id direto
    // 2. Se falhar, tentar extrair de QR/URL
    // 3. Se falhar, tentar como tracking
    // 4. Se falhar, tentar como order_id
    // 5. Se falhar, tentar como pack_id

    let shipment_id: string | null = null;
    let order_id: string | null = null;
    let pack_id: string | null = null;
    let status = '';
    let substatus = '';
    let resolved_from = 'direct';

    // 1. Tentar direto como shipment_id
    try {
      console.log(`[scan-bind] Tentando como shipment_id direto...`);
      const shipmentData = await mlGet(`/shipments/${code}`);
      if (shipmentData && shipmentData.id) {
        shipment_id = String(shipmentData.id);
        status = shipmentData.status || '';
        substatus = shipmentData.substatus || '';
        order_id = shipmentData.order_id ? String(shipmentData.order_id) : null;
        resolved_from = 'shipment_direct';
        console.log(`[scan-bind] ✓ Resolvido como shipment direto: ${shipment_id}`);
      }
    } catch (e) {
      console.log(`[scan-bind] Não é shipment_id direto: ${e.message}`);
    }

    // 2. Se não encontrou, tentar extrair de QR/URL
    if (!shipment_id) {
      try {
        console.log(`[scan-bind] Tentando extrair de QR/URL...`);
        // Padrões comuns em URLs/QR do ML
        const patterns = [
          /shipment[_-]?id[=:\/](\d+)/i,
          /envio[=:\/](\d+)/i,
          /\/shipments\/(\d+)/i,
        ];

        for (const pattern of patterns) {
          const match = code.match(pattern);
          if (match && match[1]) {
            const extracted_id = match[1];
            console.log(`[scan-bind] Extraído ID: ${extracted_id}`);
            const shipmentData = await mlGet(`/shipments/${extracted_id}`);
            if (shipmentData && shipmentData.id) {
              shipment_id = String(shipmentData.id);
              status = shipmentData.status || '';
              substatus = shipmentData.substatus || '';
              order_id = shipmentData.order_id ? String(shipmentData.order_id) : null;
              resolved_from = 'qr_extracted';
              console.log(`[scan-bind] ✓ Resolvido via QR: ${shipment_id}`);
              break;
            }
          }
        }
      } catch (e) {
        console.log(`[scan-bind] Falha ao extrair de QR: ${e.message}`);
      }
    }

    // 3. Tentar como order_id
    if (!shipment_id && /^\d+$/.test(code)) {
      try {
        console.log(`[scan-bind] Tentando como order_id...`);
        const orderData = await mlGet(`/orders/${code}`);
        if (orderData && orderData.id) {
          order_id = String(orderData.id);
          pack_id = orderData.pack_id ? String(orderData.pack_id) : null;

          // Obter shipping do pedido
          if (orderData.shipping && orderData.shipping.id) {
            shipment_id = String(orderData.shipping.id);
            status = orderData.shipping.status || '';
            substatus = orderData.shipping.substatus || '';
            resolved_from = 'order';
            console.log(`[scan-bind] ✓ Resolvido via order: ${shipment_id}`);
          }
        }
      } catch (e) {
        console.log(`[scan-bind] Não é order_id: ${e.message}`);
      }
    }

    // 4. Tentar como pack_id
    if (!shipment_id && /^\d+$/.test(code)) {
      try {
        console.log(`[scan-bind] Tentando como pack_id...`);
        const packData = await mlGet(`/packs/${code}`);
        if (packData && packData.id) {
          pack_id = String(packData.id);

          // Pegar o primeiro order do pack e seu shipping
          if (packData.orders && packData.orders.length > 0) {
            const firstOrder = packData.orders[0];
            order_id = String(firstOrder.id);

            // Buscar shipping do order
            const orderData = await mlGet(`/orders/${firstOrder.id}`);
            if (orderData.shipping && orderData.shipping.id) {
              shipment_id = String(orderData.shipping.id);
              status = orderData.shipping.status || '';
              substatus = orderData.shipping.substatus || '';
              resolved_from = 'pack';
              console.log(`[scan-bind] ✓ Resolvido via pack: ${shipment_id}`);
            }
          }
        }
      } catch (e) {
        console.log(`[scan-bind] Não é pack_id: ${e.message}`);
      }
    }

    if (!shipment_id) {
      throw new Error(`Não foi possível resolver o código: ${code}`);
    }

    // Atualizar/criar assignment com scanned_at
    const now = new Date().toISOString();
    
    // Verificar se já existe assignment
    const { data: existingAssignment } = await supabase
      .from('driver_assignments')
      .select('*')
      .eq('shipment_id', shipment_id)
      .eq('driver_id', driver_id)
      .maybeSingle();

    if (existingAssignment) {
      // Atualizar scanned_at
      const { error: updateError } = await supabase
        .from('driver_assignments')
        .update({ scanned_at: now })
        .eq('id', existingAssignment.id);

      if (updateError) throw updateError;
      console.log(`[scan-bind] Assignment atualizado: ${existingAssignment.id}`);
    } else {
      // Criar novo assignment
      const { error: insertError } = await supabase
        .from('driver_assignments')
        .insert({
          driver_id,
          shipment_id,
          assigned_at: now,
          scanned_at: now,
        });

      if (insertError) throw insertError;
      console.log(`[scan-bind] Novo assignment criado`);
    }

    // Registrar em scan_logs
    await supabase
      .from('scan_logs')
      .insert({
        driver_id,
        shipment_id,
        scanned_code: code,
        resolved_from,
        scanned_at: now,
      });

    // Atualizar cache de shipment
    const { data: cacheData } = await supabase
      .from('shipments_cache')
      .select('*')
      .eq('shipment_id', shipment_id)
      .maybeSingle();

    if (cacheData) {
      await supabase
        .from('shipments_cache')
        .update({ 
          status, 
          substatus,
          last_ml_update: now,
          order_id,
          pack_id,
        })
        .eq('shipment_id', shipment_id);
    } else {
      await supabase
        .from('shipments_cache')
        .insert({
          shipment_id,
          order_id,
          pack_id,
          status,
          substatus,
          last_ml_update: now,
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        shipment_id, 
        order_id,
        pack_id,
        status, 
        substatus,
        resolved_from,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[scan-bind] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao processar código',
        details: error.toString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
