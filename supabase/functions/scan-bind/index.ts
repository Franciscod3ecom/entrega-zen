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
    const { driver_id, shipment_id, ml_user_id } = await req.json();

    if (!driver_id || !shipment_id || !ml_user_id) {
      throw new Error('driver_id, shipment_id e ml_user_id são obrigatórios');
    }

    console.log(`[scan-bind] Processando shipment_id: ${shipment_id} para motorista: ${driver_id} (ml_user: ${ml_user_id})`);

    // 1. Buscar ml_account_id e owner_user_id
    const { data: mlAccount } = await supabase
      .from('ml_accounts')
      .select('id, owner_user_id')
      .eq('ml_user_id', ml_user_id)
      .single();

    if (!mlAccount) {
      throw new Error('Conta ML não encontrada');
    }

    // 2. Validar shipment_id com GET /shipments/{id} (fonte da verdade)
    let shipmentData;
    try {
      shipmentData = await mlGet(`/shipments/${shipment_id}`, {}, ml_user_id);
      if (!shipmentData || !shipmentData.id) {
        throw new Error(`Shipment ${shipment_id} não encontrado no Mercado Livre`);
      }
      console.log(`[scan-bind] ✓ Shipment validado: ${shipmentData.id}`);
    } catch (e: any) {
      if (e.message?.includes('404') || e.message?.includes('not found')) {
        throw new Error(`Este código (${shipment_id}) não corresponde a um envio válido. Verifique a etiqueta.`);
      }
      throw new Error(`Erro ao validar shipment: ${e.message}`);
    }

    const status = shipmentData.status || '';
    const substatus = shipmentData.substatus || '';
    const tracking = shipmentData.tracking_number || null;
    const order_id = shipmentData.order_id ? String(shipmentData.order_id) : null;
    const now = new Date().toISOString();

    // 3. Upsert em shipments_cache
    const { error: cacheError } = await supabase
      .from('shipments_cache')
      .upsert({
        shipment_id: String(shipment_id),
        owner_user_id: mlAccount.owner_user_id,
        ml_account_id: mlAccount.id,
        status,
        substatus,
        tracking_number: tracking,
        order_id,
        last_ml_update: now,
        raw_data: shipmentData,
      }, {
        onConflict: 'shipment_id'
      });

    if (cacheError) {
      console.error('[scan-bind] Erro ao atualizar cache:', cacheError);
      throw cacheError;
    }

    console.log(`[scan-bind] ✓ Cache atualizado`);

    // 4. Verificar se já existe assignment
    const { data: existingAssignment } = await supabase
      .from('driver_assignments')
      .select('*')
      .eq('shipment_id', String(shipment_id))
      .eq('driver_id', driver_id)
      .eq('owner_user_id', mlAccount.owner_user_id)
      .maybeSingle();

    if (existingAssignment) {
      // Atualizar scanned_at
      const { error: updateError } = await supabase
        .from('driver_assignments')
        .update({ scanned_at: now })
        .eq('id', existingAssignment.id);

      if (updateError) throw updateError;
      console.log(`[scan-bind] ✓ Assignment atualizado: ${existingAssignment.id}`);
    } else {
      // Criar novo assignment
      const { error: insertError } = await supabase
        .from('driver_assignments')
        .insert({
          driver_id,
          shipment_id: String(shipment_id),
          owner_user_id: mlAccount.owner_user_id,
          ml_account_id: mlAccount.id,
          assigned_at: now,
          scanned_at: now,
        });

      if (insertError) throw insertError;
      console.log(`[scan-bind] ✓ Novo assignment criado`);
    }

    // 5. Registrar em scan_logs (histórico)
    await supabase
      .from('scan_logs')
      .insert({
        driver_id,
        shipment_id: String(shipment_id),
        owner_user_id: mlAccount.owner_user_id,
        ml_account_id: mlAccount.id,
        scanned_code: String(shipment_id),
        resolved_from: 'qr_direct',
        scanned_at: now,
      });

    // 6. Retornar card completo
    return new Response(
      JSON.stringify({ 
        success: true,
        shipment_id: String(shipment_id),
        status,
        substatus,
        tracking_number: tracking,
        order_id,
        last_ml_update: now,
        message: 'Pacote vinculado com sucesso!',
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
        success: false,
        error: error.message || 'Erro ao processar código',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
