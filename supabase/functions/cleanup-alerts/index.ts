import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  orphaned_removed: number;
  duplicates_consolidated: number;
  delivered_resolved: number;
  total_cleaned: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🧹 Iniciando processo de limpeza de alertas...');

    // Executar a função mestra de limpeza
    const { data, error } = await supabase.rpc('sync_alert_counts');

    if (error) {
      console.error('❌ Erro ao executar limpeza:', error);
      throw error;
    }

    const result: CleanupResult = data?.[0] || {
      orphaned_removed: 0,
      duplicates_consolidated: 0,
      delivered_resolved: 0,
      total_cleaned: 0,
    };

    console.log('✅ Limpeza concluída com sucesso:', result);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: `✅ Limpeza concluída: ${result.total_cleaned} itens corrigidos`,
        details: {
          orphanedRemoved: result.orphaned_removed,
          duplicatesConsolidated: result.duplicates_consolidated,
          deliveredResolved: result.delivered_resolved,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Erro no cleanup-alerts:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
