import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('=== INICIANDO VERIFICAÇÃO DE PACOTES FALTANTES ===');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Data de corte: 48h atrás
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    console.log('Data de corte (48h atrás):', cutoffDate.toISOString());

    // Buscar assignments sem devolução com shipments not_delivered há mais de 48h
    const { data: missingPackages, error: queryError } = await supabase
      .from('driver_assignments')
      .select(`
        *,
        drivers(id, name, phone, carrier_id, carriers(id, name)),
        shipments_cache!inner(shipment_id, status, substatus, last_ml_update, owner_user_id, ml_account_id)
      `)
      .eq('shipments_cache.status', 'not_delivered')
      .is('returned_at', null)
      .lt('shipments_cache.last_ml_update', cutoffDate.toISOString());

    if (queryError) {
      console.error('Erro ao buscar pacotes faltantes:', queryError);
      throw queryError;
    }

    console.log(`Encontrados ${missingPackages?.length || 0} pacotes não devolvidos`);

    let alertsCreated = 0;
    let alertsUpdated = 0;

    // Processar cada pacote faltante
    for (const pkg of missingPackages || []) {
      const shipmentCache = Array.isArray(pkg.shipments_cache) 
        ? pkg.shipments_cache[0] 
        : pkg.shipments_cache;

      if (!shipmentCache) continue;

      const alertData = {
        owner_user_id: pkg.owner_user_id,
        ml_account_id: shipmentCache.ml_account_id || null,
        shipment_id: pkg.shipment_id,
        driver_id: pkg.driver_id,
        carrier_id: pkg.drivers?.carrier_id || null,
        alert_type: 'not_delivered_not_returned',
        status: 'pending',
        notes: `Não devolvido há mais de 48h. Última atualização ML: ${shipmentCache.last_ml_update}. Status: ${shipmentCache.status}, Substatus: ${shipmentCache.substatus || 'N/A'}`
      };

      // Verificar se já existe alerta para este shipment
      const { data: existingAlert } = await supabase
        .from('shipment_alerts')
        .select('id, status')
        .eq('shipment_id', pkg.shipment_id)
        .eq('alert_type', 'not_delivered_not_returned')
        .eq('owner_user_id', pkg.owner_user_id)
        .maybeSingle();

      if (existingAlert) {
        // Atualizar alerta existente se ainda estiver pendente
        if (existingAlert.status === 'pending') {
          const { error: updateError } = await supabase
            .from('shipment_alerts')
            .update({ notes: alertData.notes })
            .eq('id', existingAlert.id);

          if (!updateError) {
            alertsUpdated++;
            console.log(`Alerta atualizado: ${pkg.shipment_id}`);
          }
        }
      } else {
        // Criar novo alerta
        const { error: insertError } = await supabase
          .from('shipment_alerts')
          .insert(alertData);

        if (!insertError) {
          alertsCreated++;
          console.log(`Novo alerta criado: ${pkg.shipment_id}`);
        } else {
          console.error(`Erro ao criar alerta para ${pkg.shipment_id}:`, insertError);
        }
      }
    }

    console.log('=== VERIFICAÇÃO CONCLUÍDA ===');
    console.log(`Novos alertas criados: ${alertsCreated}`);
    console.log(`Alertas atualizados: ${alertsUpdated}`);

    return new Response(
      JSON.stringify({
        success: true,
        packagesChecked: missingPackages?.length || 0,
        alertsCreated,
        alertsUpdated,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Erro em check-missing-packages:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
