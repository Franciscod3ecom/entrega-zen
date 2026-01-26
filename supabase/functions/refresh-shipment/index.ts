import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mlGet, checkRateLimit } from '../_shared/ml-client.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const RefreshShipmentSchema = z.object({
  shipment_id: z.string()
    .regex(/^\d+$/, 'shipment_id deve conter apenas números')
    .min(1, 'shipment_id não pode estar vazio')
    .max(20, 'shipment_id muito longo'),
  ml_user_id: z.number()
    .int('ml_user_id deve ser um número inteiro')
    .positive('ml_user_id deve ser positivo'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({} as any));
    
    // Validate input with Zod
    const validation = RefreshShipmentSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos',
          message: firstError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { shipment_id, ml_user_id } = validation.data;

    // Rate limiting: 20 requests per minute per shipment
    const rateLimitKey = `refresh-shipment:${shipment_id}`;
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Aguarde um momento.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.error('[refresh-shipment] Erro ao atualizar cache:', updateError);
      throw new Error('Erro ao salvar dados. Tente novamente.');
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
    // Log full error server-side
    console.error('[refresh-shipment] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao atualizar envio.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
