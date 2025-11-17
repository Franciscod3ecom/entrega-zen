import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticReport {
  timestamp: string;
  summary: {
    total_alerts: number;
    pending_alerts: number;
    resolved_alerts: number;
    shipments_with_alerts: number;
    divergence: number;
  };
  issues: {
    orphaned_alerts: any[];
    duplicate_alerts: any[];
    alerts_on_delivered_shipments: any[];
    alerts_on_missing_shipments: any[];
  };
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔍 Iniciando diagnóstico de inconsistências...');

    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total_alerts: 0,
        pending_alerts: 0,
        resolved_alerts: 0,
        shipments_with_alerts: 0,
        divergence: 0,
      },
      issues: {
        orphaned_alerts: [],
        duplicate_alerts: [],
        alerts_on_delivered_shipments: [],
        alerts_on_missing_shipments: [],
      },
      recommendations: [],
    };

    // 1. Contadores gerais
    const { data: alertCounts } = await supabase
      .from('shipment_alerts')
      .select('status', { count: 'exact' });

    const { count: totalAlerts } = await supabase
      .from('shipment_alerts')
      .select('*', { count: 'exact', head: true });

    const { count: pendingAlerts } = await supabase
      .from('shipment_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: resolvedAlerts } = await supabase
      .from('shipment_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    // 2. Contar envios únicos com alertas PENDENTES
    const { data: shipmentsWithAlerts } = await supabase
      .from('shipment_alerts')
      .select('shipment_id')
      .eq('status', 'pending');

    const uniqueShipments = new Set(shipmentsWithAlerts?.map(a => a.shipment_id) || []);

    report.summary = {
      total_alerts: totalAlerts || 0,
      pending_alerts: pendingAlerts || 0,
      resolved_alerts: resolvedAlerts || 0,
      shipments_with_alerts: uniqueShipments.size,
      divergence: (pendingAlerts || 0) - uniqueShipments.size,
    };

    console.log('📊 Contadores:', report.summary);

    // 3. Detectar alertas órfãos (shipment_id não existe em shipments_cache)
    const { data: orphanedAlerts } = await supabase
      .from('shipment_alerts')
      .select(`
        id,
        shipment_id,
        alert_type,
        status,
        detected_at,
        notes
      `)
      .eq('status', 'pending')
      .not('shipment_id', 'in', `(SELECT shipment_id FROM shipments_cache)`);

    report.issues.orphaned_alerts = orphanedAlerts || [];
    console.log(`⚠️ Alertas órfãos: ${orphanedAlerts?.length || 0}`);

    // 4. Detectar alertas duplicados (mesmo shipment_id + mesmo alert_type + status pending)
    const { data: duplicateAlerts } = await supabase.rpc('identify_duplicate_alerts');

    report.issues.duplicate_alerts = duplicateAlerts || [];
    console.log(`🔄 Alertas duplicados: ${duplicateAlerts?.length || 0}`);

    // 5. Detectar alertas em envios já finalizados
    // Primeiro buscar todos os alertas pendentes
    const { data: pendingAlertsData } = await supabase
      .from('shipment_alerts')
      .select('id, shipment_id, alert_type, detected_at')
      .eq('status', 'pending');

    // Buscar os status dos shipments correspondentes
    const shipmentIds = pendingAlertsData?.map(a => a.shipment_id) || [];
    const { data: finalizedShipments } = await supabase
      .from('shipments_cache')
      .select('shipment_id, status, substatus, last_ml_update')
      .in('shipment_id', shipmentIds)
      .in('status', ['delivered', 'not_delivered']);

    // Combinar os dados
    const alertsOnDelivered = pendingAlertsData
      ?.filter(alert => 
        finalizedShipments?.some(s => s.shipment_id === alert.shipment_id)
      )
      .map(alert => {
        const shipment = finalizedShipments?.find(s => s.shipment_id === alert.shipment_id);
        return { ...alert, ...shipment };
      }) || [];

    report.issues.alerts_on_delivered_shipments = alertsOnDelivered;
    console.log(`✅ Alertas em envios finalizados: ${alertsOnDelivered.length}`);

    // 6. Detectar alertas com shipment_id que não existe mais
    const { data: alertsOnMissing } = await supabase
      .from('shipment_alerts')
      .select('id, shipment_id, alert_type, detected_at')
      .eq('status', 'pending')
      .not('shipment_id', 'in', `(SELECT shipment_id FROM shipments_cache)`);

    report.issues.alerts_on_missing_shipments = alertsOnMissing || [];
    console.log(`❌ Alertas de shipments inexistentes: ${alertsOnMissing?.length || 0}`);

    // 7. Gerar recomendações
    if (report.issues.orphaned_alerts.length > 0) {
      report.recommendations.push(
        `🔧 Remover ${report.issues.orphaned_alerts.length} alertas órfãos (sem shipment correspondente)`
      );
    }

    if (report.issues.duplicate_alerts.length > 0) {
      report.recommendations.push(
        `🔧 Consolidar ${report.issues.duplicate_alerts.length} grupos de alertas duplicados (manter apenas o mais antigo)`
      );
    }

    if (report.issues.alerts_on_delivered_shipments.length > 0) {
      report.recommendations.push(
        `🔧 Resolver automaticamente ${report.issues.alerts_on_delivered_shipments.length} alertas de envios já finalizados`
      );
    }

    if (report.issues.alerts_on_missing_shipments.length > 0) {
      report.recommendations.push(
        `🔧 Arquivar ${report.issues.alerts_on_missing_shipments.length} alertas de shipments que não existem mais`
      );
    }

    if (report.summary.divergence > 10) {
      report.recommendations.push(
        `⚠️ ATENÇÃO: Divergência de ${report.summary.divergence} entre contadores. Recomenda-se executar limpeza completa.`
      );
    }

    if (report.recommendations.length === 0) {
      report.recommendations.push('✅ Nenhuma inconsistência crítica detectada!');
    }

    console.log('✅ Diagnóstico concluído');

    return new Response(
      JSON.stringify({
        success: true,
        report,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Erro no diagnóstico:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
