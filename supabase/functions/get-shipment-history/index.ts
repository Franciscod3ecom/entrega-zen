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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shipment_id, ml_user_id } = await req.json();

    if (!shipment_id || !ml_user_id) {
      return new Response(
        JSON.stringify({ error: 'shipment_id e ml_user_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    console.error('Erro em get-shipment-history:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
