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
const ResolveShipmentSchema = z.object({
  input_id: z.string()
    .min(1, 'input_id não pode estar vazio')
    .max(50, 'input_id muito longo'),
  ml_user_id: z.number()
    .int('ml_user_id deve ser um número inteiro')
    .positive('ml_user_id deve ser positivo'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input with Zod
    const validation = ResolveShipmentSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos',
          message: firstError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    const { input_id, ml_user_id } = validation.data;

    // Rate limiting: 30 requests per minute per user
    const rateLimitKey = `resolve-shipment:${ml_user_id}`;
    if (!checkRateLimit(rateLimitKey, 30, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Aguarde um momento.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolvendo ID:', input_id, 'ml_user:', ml_user_id);

    // Buscar ml_account_id e owner_user_id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: mlAccount } = await supabase
      .from('ml_accounts')
      .select('id, owner_user_id')
      .eq('ml_user_id', ml_user_id)
      .single();

    if (!mlAccount) {
      throw new Error('Conta ML não encontrada');
    }

    let shipmentData: any = null;
    let orderId: string | null = null;
    let packId: string | null = null;

    // Estratégia 1: Tentar como shipment_id direto
    try {
      console.log('Tentando como shipment_id...');
      shipmentData = await mlGet(`/shipments/${input_id}`, {}, ml_user_id);
      console.log('Sucesso! É um shipment_id');
      
      if (shipmentData.order_id) {
        orderId = shipmentData.order_id.toString();
      }
    } catch (error: any) {
      console.log('Não é shipment_id, tentando pack_id...');

      // Estratégia 2: Tentar como pack_id
      try {
        const packData = await mlGet(`/packs/${input_id}`, {}, ml_user_id);
        packId = input_id;
        console.log('Sucesso! É um pack_id com', packData.orders?.length || 0, 'orders');

        // Pegar o primeiro order do pack
        if (packData.orders && packData.orders.length > 0) {
          const firstOrder = packData.orders[0];
          orderId = firstOrder.id.toString();
          
          // Buscar shipment do order
          const orderData = await mlGet(`/orders/${orderId}`, {}, ml_user_id);
          
          if (orderData.shipping?.id) {
            shipmentData = await mlGet(`/shipments/${orderData.shipping.id}`, {}, ml_user_id);
            console.log('Shipment encontrado via pack/order');
          }
        }
      } catch (packError: any) {
        console.log('Não é pack_id, tentando order_id...');

        // Estratégia 3: Tentar como order_id
        try {
          const orderData = await mlGet(`/orders/${input_id}`, {}, ml_user_id);
          orderId = input_id;
          packId = orderData.pack_id ? orderData.pack_id.toString() : null;
          
          if (orderData.shipping?.id) {
            shipmentData = await mlGet(`/shipments/${orderData.shipping.id}`, {}, ml_user_id);
            console.log('Shipment encontrado via order');
          } else {
            throw new Error('Pedido não possui envio associado');
          }
        } catch (orderError: any) {
          // Log detailed error server-side only
          console.error(`[resolve-shipment] ID ${input_id} inválido:`, orderError.message);
          throw new Error('ID inválido. Não foi possível identificar o envio.');
        }
      }
    }

    if (!shipmentData) {
      throw new Error('Não foi possível obter dados do envio');
    }

    // Salvar no cache
    const { error: cacheError } = await supabase
      .from('shipments_cache')
      .upsert({
        shipment_id: shipmentData.id.toString(),
        owner_user_id: mlAccount.owner_user_id,
        ml_account_id: mlAccount.id,
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
      console.error('[resolve-shipment] Erro ao salvar cache:', cacheError);
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
    // Log full error server-side
    console.error('[resolve-shipment] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao resolver envio.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
