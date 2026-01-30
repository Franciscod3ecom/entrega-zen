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
    console.log('[cleanup-old-shipments] Iniciando limpeza de dados antigos');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Opções do body (opcionais)
    let deleteOlderThanDays = 0; // 0 = não deletar, apenas limpar raw_data
    let dryRun = false;

    try {
      const body = await req.json();
      deleteOlderThanDays = body.delete_older_than_days || 0;
      dryRun = body.dry_run || false;
    } catch {
      // Body vazio é ok
    }

    let slimmedCount = 0;
    let deletedCount = 0;

    // 1. Limpar raw_data de envios finalizados usando a função SQL
    console.log('[cleanup-old-shipments] Executando limpeza de raw_data...');
    
    const { data: slimResult, error: slimError } = await supabase.rpc('cleanup_old_shipments_raw_data');
    
    if (slimError) {
      console.error('[cleanup-old-shipments] Erro ao limpar raw_data:', slimError);
    } else {
      slimmedCount = slimResult?.[0]?.cleaned_count || 0;
      console.log(`[cleanup-old-shipments] Raw_data limpos: ${slimmedCount} registros`);
    }

    // 2. Opcionalmente deletar envios muito antigos (se configurado)
    if (deleteOlderThanDays > 0 && !dryRun) {
      console.log(`[cleanup-old-shipments] Deletando envios finalizados com mais de ${deleteOlderThanDays} dias...`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deleteOlderThanDays);
      
      const { data: deleted, error: deleteError } = await supabase
        .from('shipments_cache')
        .delete()
        .in('status', ['delivered', 'not_delivered', 'cancelled'])
        .lt('last_ml_update', cutoffDate.toISOString())
        .select('shipment_id');
      
      if (deleteError) {
        console.error('[cleanup-old-shipments] Erro ao deletar:', deleteError);
      } else {
        deletedCount = deleted?.length || 0;
        console.log(`[cleanup-old-shipments] Deletados: ${deletedCount} registros`);
      }
    }

    // 3. Limpar tabelas de sistema (scan_logs antigos, etc.)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: oldLogs, error: logsError } = await supabase
      .from('scan_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id');
    
    const logsDeleted = oldLogs?.length || 0;
    if (logsDeleted > 0) {
      console.log(`[cleanup-old-shipments] Logs de scan antigos deletados: ${logsDeleted}`);
    }

    // 4. Calcular economia estimada
    const estimatedSavingsKB = slimmedCount * 3.5; // ~3.5KB por registro

    const result = {
      success: true,
      slimmed_raw_data: slimmedCount,
      deleted_shipments: deletedCount,
      deleted_scan_logs: logsDeleted,
      estimated_savings_kb: Math.round(estimatedSavingsKB),
      dry_run: dryRun,
      message: `Limpeza concluída: ${slimmedCount} raw_data otimizados, ${deletedCount} envios deletados`,
    };

    console.log('[cleanup-old-shipments] Resultado:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[cleanup-old-shipments] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
