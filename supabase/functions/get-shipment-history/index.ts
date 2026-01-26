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
const ShipmentHistorySchema = z.object({
  shipment_id: z.string()
    .regex(/^\d+$/, 'shipment_id deve conter apenas números')
    .max(20, 'shipment_id muito longo'),
  ml_user_id: z.number()
    .int('ml_user_id deve ser um número inteiro')
    .positive('ml_user_id deve ser positivo'),
});

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input with Zod
    const validation = ShipmentHistorySchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos',
          message: firstError.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { shipment_id, ml_user_id } = validation.data;

    // Rate limiting: 30 requests per minute per user
    const rateLimitKey = `shipment-history:${ml_user_id}`;
    if (!checkRateLimit(rateLimitKey, 30, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Aguarde um momento.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Buscando histórico para shipment:', shipment_id);

    // Buscar histórico do envio
    const historyData = await mlGet(`/shipments/${shipment_id}/history`, {}, ml_user_id);

    // Formatar eventos para exibição
    const events = (historyData || []).map((event: any) => ({
      date: event.date_created || event.date,
      status: event.status,
      substatus: event.substatus || null,
      description: event.status_detail || event.description || null,
      location: event.tracking_location || null,
    }));

    console.log(`✅ ${events.length} eventos encontrados para shipment ${shipment_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        shipment_id,
        events,
        total: events.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // Log full error server-side
    console.error('[get-shipment-history] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao buscar histórico.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
