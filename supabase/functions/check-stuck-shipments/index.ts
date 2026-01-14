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
    console.log('[check-stuck-shipments] Iniciando verificação de problemas');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const alerts: Array<{
      type: string;
      shipment_id: string;
      owner_user_id: string;
      ml_account_id: string | null;
      driver_id: string | null;
      reason: string;
    }> = [];

    const finalStatuses = ['delivered', 'not_delivered', 'cancelled', 'returned_to_sender'];

    // 1. NOT_DELIVERED SEM DEVOLUÇÃO (principal alerta operacional)
    // Qualquer envio com status not_delivered que não tenha registro de returned_at
    console.log('[check-stuck-shipments] Verificando envios not_delivered sem devolução...');
    
    const { data: notDeliveredShipments, error: ndError } = await supabase
      .from('shipments_cache')
      .select(`
        shipment_id, 
        owner_user_id, 
        ml_account_id, 
        status,
        last_ml_update
      `)
      .eq('status', 'not_delivered');

    if (ndError) {
      console.error('[check-stuck-shipments] Erro ao buscar not_delivered:', ndError);
    } else if (notDeliveredShipments) {
      console.log(`[check-stuck-shipments] Encontrados ${notDeliveredShipments.length} envios not_delivered`);
      
      for (const shipment of notDeliveredShipments) {
        // Verificar se tem assignment com returned_at
        const { data: assignments } = await supabase
          .from('driver_assignments')
          .select('id, driver_id, returned_at')
          .eq('shipment_id', shipment.shipment_id)
          .order('assigned_at', { ascending: false })
          .limit(1);

        const latestAssignment = assignments?.[0];
        const hasReturn = latestAssignment?.returned_at != null;

        if (!hasReturn) {
          // Verificar se já existe alerta ativo
          const { data: existingAlert } = await supabase
            .from('shipment_alerts')
            .select('id')
            .eq('shipment_id', shipment.shipment_id)
            .eq('alert_type', 'not_delivered_no_return')
            .is('resolved_at', null)
            .maybeSingle();

          if (!existingAlert) {
            alerts.push({
              type: 'not_delivered_no_return',
              shipment_id: shipment.shipment_id,
              owner_user_id: shipment.owner_user_id,
              ml_account_id: shipment.ml_account_id,
              driver_id: latestAssignment?.driver_id || null,
              reason: `Envio não entregue sem registro de devolução (última atualização: ${shipment.last_ml_update})`,
            });
          }
        }
      }
    }

    // 2. ENVIOS PARADOS (48h+ sem atualização e status não final)
    const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const { data: stuckShipments } = await supabase
      .from('shipments_cache')
      .select(`
        shipment_id, 
        owner_user_id, 
        ml_account_id, 
        status, 
        last_ml_update
      `)
      .not('status', 'in', `(${finalStatuses.join(',')})`)
      .lt('last_ml_update', hours48Ago);

    if (stuckShipments) {
      console.log(`[check-stuck-shipments] Encontrados ${stuckShipments.length} envios parados 48h+`);
      
      for (const shipment of stuckShipments) {
        // Buscar driver se houver
        const { data: assignments } = await supabase
          .from('driver_assignments')
          .select('driver_id')
          .eq('shipment_id', shipment.shipment_id)
          .is('returned_at', null)
          .limit(1);

        const activeDriver = assignments?.[0]?.driver_id || null;

        // Verificar se já existe alerta ativo para este shipment
        const { data: existingAlert } = await supabase
          .from('shipment_alerts')
          .select('id')
          .eq('shipment_id', shipment.shipment_id)
          .eq('alert_type', 'stuck_shipment')
          .is('resolved_at', null)
          .maybeSingle();

        if (!existingAlert) {
          alerts.push({
            type: 'stuck_shipment',
            shipment_id: shipment.shipment_id,
            owner_user_id: shipment.owner_user_id,
            ml_account_id: shipment.ml_account_id,
            driver_id: activeDriver,
            reason: `Envio sem atualização há mais de 48 horas (última atualização: ${shipment.last_ml_update})`,
          });
        }
      }
    }

    // 3. PRONTOS MAS NÃO EXPEDIDOS (24h+ com status ready_to_ship sem motorista)
    const hours24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: readyNotShipped } = await supabase
      .from('shipments_cache')
      .select(`
        shipment_id, 
        owner_user_id, 
        ml_account_id, 
        created_at
      `)
      .eq('status', 'ready_to_ship')
      .lt('created_at', hours24Ago);

    if (readyNotShipped) {
      console.log(`[check-stuck-shipments] Encontrados ${readyNotShipped.length} envios prontos não expedidos 24h+`);
      
      for (const shipment of readyNotShipped) {
        // Verificar se tem assignment
        const { data: assignments } = await supabase
          .from('driver_assignments')
          .select('id')
          .eq('shipment_id', shipment.shipment_id)
          .is('returned_at', null)
          .limit(1);

        const hasActiveAssignment = assignments && assignments.length > 0;

        if (!hasActiveAssignment) {
          // Verificar se já existe alerta ativo
          const { data: existingAlert } = await supabase
            .from('shipment_alerts')
            .select('id')
            .eq('shipment_id', shipment.shipment_id)
            .eq('alert_type', 'ready_not_shipped')
            .is('resolved_at', null)
            .maybeSingle();

          if (!existingAlert) {
            alerts.push({
              type: 'ready_not_shipped',
              shipment_id: shipment.shipment_id,
              owner_user_id: shipment.owner_user_id,
              ml_account_id: shipment.ml_account_id,
              driver_id: null,
              reason: `Envio pronto há mais de 24 horas mas não foi atribuído a motorista (criado em: ${shipment.created_at})`,
            });
          }
        }
      }
    }

    // 4. COM MOTORISTA SEM DEVOLUÇÃO (72h+ após assignment sem returned_at)
    const hours72Ago = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

    const { data: notReturned } = await supabase
      .from('driver_assignments')
      .select('id, shipment_id, driver_id, assigned_at, owner_user_id, ml_account_id')
      .is('returned_at', null)
      .lt('assigned_at', hours72Ago);

    if (notReturned) {
      console.log(`[check-stuck-shipments] Encontrados ${notReturned.length} envios com motorista sem devolução 72h+`);
      
      for (const assignment of notReturned) {
        // Verificar se o shipment já foi entregue no cache
        const { data: shipmentCache } = await supabase
          .from('shipments_cache')
          .select('status')
          .eq('shipment_id', assignment.shipment_id)
          .maybeSingle();

        const isDelivered = shipmentCache && finalStatuses.includes(shipmentCache.status);

        if (!isDelivered) {
          // Verificar se já existe alerta ativo
          const { data: existingAlert } = await supabase
            .from('shipment_alerts')
            .select('id')
            .eq('shipment_id', assignment.shipment_id)
            .eq('alert_type', 'not_returned')
            .is('resolved_at', null)
            .maybeSingle();

          if (!existingAlert) {
            alerts.push({
              type: 'not_returned',
              shipment_id: assignment.shipment_id,
              owner_user_id: assignment.owner_user_id,
              ml_account_id: assignment.ml_account_id,
              driver_id: assignment.driver_id,
              reason: `Envio com motorista há mais de 72 horas sem registro de devolução (atribuído em: ${assignment.assigned_at})`,
            });
          }
        }
      }
    }

    // Inserir alertas
    let created = 0;
    if (alerts.length > 0) {
      console.log(`[check-stuck-shipments] Criando ${alerts.length} novos alertas`);
      
      for (const alert of alerts) {
        const { error: insertError } = await supabase
          .from('shipment_alerts')
          .insert({
            alert_type: alert.type,
            shipment_id: alert.shipment_id,
            owner_user_id: alert.owner_user_id,
            ml_account_id: alert.ml_account_id,
            driver_id: alert.driver_id,
            notes: alert.reason,
            status: 'pending',
            detected_at: now.toISOString(),
          });

        if (insertError) {
          console.error(`[check-stuck-shipments] Erro ao criar alerta:`, insertError);
        } else {
          created++;
        }
      }
    }

    console.log(`[check-stuck-shipments] Concluído: ${created} alertas criados`);

    return new Response(
      JSON.stringify({
        success: true,
        alertsCreated: created,
        checks: {
          not_delivered_no_return: notDeliveredShipments?.length || 0,
          stuck_48h: stuckShipments?.length || 0,
          ready_not_shipped_24h: readyNotShipped?.length || 0,
          not_returned_72h: notReturned?.length || 0,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[check-stuck-shipments] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
