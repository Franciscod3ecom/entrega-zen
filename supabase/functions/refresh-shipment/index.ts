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
    const { shipment_id, ml_user_id } = await req.json();

    if (!shipment_id || !ml_user_id) {
      throw new Error('shipment_id e ml_user_id são obrigatórios');
    }

    console.log('Atualizando shipment:', shipment_id, 'ml_user:', ml_user_id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Buscar ml_account_id e owner_user_id
    const { data: mlAccount } = await supabase
      .from('ml_accounts')
      .select('id, owner_user_id')
      .eq('ml_user_id', ml_user_id)
      .single();

    if (!mlAccount) {
      throw new Error('Conta ML não encontrada');
    }

    // Buscar dados atualizados do shipment
    const shipmentData = await mlGet(`/shipments/${shipment_id}`, {}, ml_user_id);

    // Atualizar cache
    const { error: updateError } = await supabase
      .from('shipments_cache')
      .upsert({
        shipment_id: shipment_id,
        owner_user_id: mlAccount.owner_user_id,
        ml_account_id: mlAccount.id,
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

    if (updateError) {
      throw updateError;
    }

    console.log('Shipment atualizado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        shipment_id: shipment_id,
        status: shipmentData.status || shipmentData.substatus,
        substatus: shipmentData.status_history?.substatus || null,
        tracking_number: shipmentData.tracking_number || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erro em refresh-shipment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
