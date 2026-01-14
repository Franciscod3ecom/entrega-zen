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
    const body = await req.json().catch(() => ({} as any));
    const shipment_id = body?.shipment_id;
    const ml_user_id = body?.ml_user_id;

    if (!shipment_id || !ml_user_id) {
      // Não lançar exceção aqui para evitar poluição de logs com requests inválidos
      return new Response(
        JSON.stringify({ error: 'shipment_id e ml_user_id são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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

    // 1. Buscar dados ATUAIS do cache para merge inteligente
    const { data: currentCache } = await supabase
      .from('shipments_cache')
      .select('*')
      .eq('shipment_id', shipment_id)
      .maybeSingle();

    console.log('📥 Dados atuais do cache:', {
      order_id: currentCache?.order_id,
      pack_id: currentCache?.pack_id,
      tracking: currentCache?.tracking_number,
    });

    console.log('📦 Dados da API ML:', {
      order_id: shipmentData.order_id,
      pack_id: shipmentData.pack_id,
      tracking: shipmentData.tracking_number,
      status: shipmentData.status,
    });

    // 2. Fazer MERGE inteligente - preserva dados existentes se API retornar null
    const mergedData = {
      shipment_id: shipment_id,
      owner_user_id: mlAccount.owner_user_id,
      ml_account_id: mlAccount.id,
      
      // ✅ Manter dados existentes se API retornar null
      order_id: shipmentData.order_id 
        ? String(shipmentData.order_id) 
        : (currentCache?.order_id || null),
        
      pack_id: shipmentData.pack_id 
        ? String(shipmentData.pack_id) 
        : (currentCache?.pack_id || null),
        
      tracking_number: shipmentData.tracking_number 
        || currentCache?.tracking_number 
        || null,
      
      // ✅ Status sempre atualiza (fonte de verdade)
      status: shipmentData.status || shipmentData.substatus || 'unknown',
      substatus: shipmentData.status_history?.substatus || null,
      
      // ✅ Merge de raw_data (preserva campos antigos + adiciona novos)
      raw_data: {
        ...(currentCache?.raw_data as Record<string, any> || {}),
        ...shipmentData,
        _last_refresh: new Date().toISOString(),
        _preserved_from_cache: currentCache ? {
          order_id: currentCache.order_id,
          pack_id: currentCache.pack_id,
          tracking_number: currentCache.tracking_number,
        } : null,
      },
      
      last_ml_update: new Date().toISOString(),
    };

    console.log('✅ Dados mesclados:', {
      order_id: mergedData.order_id,
      pack_id: mergedData.pack_id,
      tracking: mergedData.tracking_number,
      preservou_order: mergedData.order_id === currentCache?.order_id,
      preservou_pack: mergedData.pack_id === currentCache?.pack_id,
      preservou_tracking: mergedData.tracking_number === currentCache?.tracking_number,
    });

    // 3. Atualizar cache com dados mesclados
    const { error: updateError } = await supabase
      .from('shipments_cache')
      .upsert(mergedData, {
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
