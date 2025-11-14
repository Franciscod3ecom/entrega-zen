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
    console.log('[auto-refresh-shipments] Iniciando atualização automática');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar envios ativos (status que indicam que ainda estão em trânsito)
    const activeStatuses = ['shipped', 'ready_to_ship', 'handling', 'out_for_delivery'];
    
    const { data: activeShipments, error: fetchError } = await supabase
      .from('shipments_cache')
      .select('shipment_id, ml_account_id, owner_user_id, status')
      .in('status', activeStatuses)
      .order('last_ml_update', { ascending: true })
      .limit(100); // Processar até 100 por vez para não sobrecarregar

    if (fetchError) {
      console.error('[auto-refresh-shipments] Erro ao buscar shipments:', fetchError);
      throw fetchError;
    }

    if (!activeShipments || activeShipments.length === 0) {
      console.log('[auto-refresh-shipments] Nenhum envio ativo encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum envio ativo para atualizar', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[auto-refresh-shipments] Encontrados ${activeShipments.length} envios ativos para atualizar`);

    let updated = 0;
    let errors = 0;

    // Agrupar por ml_account para otimizar
    const byAccount = new Map<string, typeof activeShipments>();
    
    for (const shipment of activeShipments) {
      if (!shipment.ml_account_id) continue;
      
      if (!byAccount.has(shipment.ml_account_id)) {
        byAccount.set(shipment.ml_account_id, []);
      }
      byAccount.get(shipment.ml_account_id)!.push(shipment);
    }

    // Processar por conta ML
    for (const [mlAccountId, shipments] of byAccount.entries()) {
      // Buscar ml_user_id da conta
      const { data: mlAccount } = await supabase
        .from('ml_accounts')
        .select('ml_user_id')
        .eq('id', mlAccountId)
        .single();

      if (!mlAccount) {
        console.error(`[auto-refresh-shipments] Conta ML não encontrada: ${mlAccountId}`);
        errors += shipments.length;
        continue;
      }

      // Atualizar cada shipment
      for (const shipment of shipments) {
        try {
          console.log(`[auto-refresh-shipments] Atualizando shipment ${shipment.shipment_id}`);
          
          const shipmentData = await mlGet(`/shipments/${shipment.shipment_id}`, {}, mlAccount.ml_user_id);

          // Atualizar cache
          const { error: updateError } = await supabase
            .from('shipments_cache')
            .update({
              status: shipmentData.status || shipmentData.substatus || 'unknown',
              substatus: shipmentData.status_history?.substatus || null,
              tracking_number: shipmentData.tracking_number || null,
              last_ml_update: new Date().toISOString(),
              raw_data: shipmentData,
            })
            .eq('shipment_id', shipment.shipment_id);

          if (updateError) {
            console.error(`[auto-refresh-shipments] Erro ao atualizar ${shipment.shipment_id}:`, updateError);
            errors++;
          } else {
            updated++;
          }

          // Rate limiting: aguardar 100ms entre requisições para não bater limite da API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          console.error(`[auto-refresh-shipments] Erro ao processar ${shipment.shipment_id}:`, error.message);
          errors++;
        }
      }
    }

    console.log(`[auto-refresh-shipments] Concluído: ${updated} atualizados, ${errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        errors,
        total: activeShipments.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[auto-refresh-shipments] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
