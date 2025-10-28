import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { mlGet } from "../_shared/ml-client.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Extrair owner_user_id do JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Token inválido');
    }

    const owner_user_id = user.id;
    
    // Validação de entrada com Zod
    const scanBindAutoSchema = z.object({
      driver_id: z.string().uuid('driver_id deve ser um UUID válido'),
      shipment_id: z.string().regex(/^\d+$/, 'shipment_id deve ser numérico').max(20, 'shipment_id muito longo')
    });

    const body = await req.json();
    const validationResult = scanBindAutoSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0].message;
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { driver_id, shipment_id } = validationResult.data;

    console.log(`[scan-bind-auto] Iniciando busca multi-conta para shipment: ${shipment_id} (owner: ${owner_user_id})`);

    // 1. Buscar todas as contas ML ativas do usuário
    const { data: mlAccounts, error: accountsError } = await supabase
      .from('ml_accounts')
      .select('id, ml_user_id, nickname, owner_user_id')
      .eq('owner_user_id', owner_user_id);

    if (accountsError) throw accountsError;

    if (!mlAccounts || mlAccounts.length === 0) {
      throw new Error('Nenhuma conta ML configurada');
    }

    console.log(`[scan-bind-auto] Encontradas ${mlAccounts.length} contas para buscar`);

    // 2. Tentar validar shipment em cada conta
    let shipmentData = null;
    let foundAccount = null;

    for (const account of mlAccounts) {
      try {
        console.log(`[scan-bind-auto] Tentando conta ${account.nickname} (${account.ml_user_id})...`);
        
        const data = await mlGet(`/shipments/${shipment_id}`, {}, account.ml_user_id);
        
        if (data && data.id) {
          shipmentData = data;
          foundAccount = account;
          console.log(`[scan-bind-auto] ✓ Shipment encontrado na conta ${account.nickname}!`);
          break;
        }
      } catch (e: any) {
        // Se 404, tentar próxima conta
        if (e.message?.includes('404') || e.message?.includes('not found')) {
          console.log(`[scan-bind-auto] Shipment não encontrado na conta ${account.nickname}, tentando próxima...`);
          continue;
        }
        // Outros erros (rate limit, token inválido, etc) também tentam próxima
        console.log(`[scan-bind-auto] Erro na conta ${account.nickname}: ${e.message}, tentando próxima...`);
        continue;
      }
    }

    // 3. Se não encontrou em nenhuma conta
    if (!shipmentData || !foundAccount) {
      throw new Error(`Este código (${shipment_id}) não foi encontrado em nenhuma das suas contas do Mercado Livre. Verifique a etiqueta.`);
    }

    // 4. Processar shipment encontrado (mesma lógica do scan-bind)
    const status = shipmentData.status || '';
    const substatus = shipmentData.substatus || '';
    const tracking = shipmentData.tracking_number || null;
    const order_id = shipmentData.order_id ? String(shipmentData.order_id) : null;
    const now = new Date().toISOString();

    // 5. Upsert em shipments_cache
    const { error: cacheError } = await supabase
      .from('shipments_cache')
      .upsert({
        shipment_id: String(shipment_id),
        owner_user_id: owner_user_id,
        ml_account_id: foundAccount.id,
        status,
        substatus,
        tracking_number: tracking,
        order_id,
        last_ml_update: now,
        raw_data: shipmentData,
      }, {
        onConflict: 'shipment_id'
      });

    if (cacheError) {
      console.error('[scan-bind-auto] Erro ao atualizar cache:', cacheError);
      throw cacheError;
    }

    console.log(`[scan-bind-auto] ✓ Cache atualizado`);

    // 6. Verificar se já existe assignment
    const { data: existingAssignment } = await supabase
      .from('driver_assignments')
      .select('*')
      .eq('shipment_id', String(shipment_id))
      .eq('driver_id', driver_id)
      .eq('owner_user_id', owner_user_id)
      .maybeSingle();

    if (existingAssignment) {
      // Atualizar scanned_at
      const { error: updateError } = await supabase
        .from('driver_assignments')
        .update({ scanned_at: now })
        .eq('id', existingAssignment.id);

      if (updateError) throw updateError;
      console.log(`[scan-bind-auto] ✓ Assignment atualizado: ${existingAssignment.id}`);
    } else {
      // Criar novo assignment
      const { error: insertError } = await supabase
        .from('driver_assignments')
        .insert({
          driver_id,
          shipment_id: String(shipment_id),
          owner_user_id: owner_user_id,
          ml_account_id: foundAccount.id,
          assigned_at: now,
          scanned_at: now,
        });

      if (insertError) throw insertError;
      console.log(`[scan-bind-auto] ✓ Novo assignment criado`);
    }

    // 7. Registrar em scan_logs
    await supabase
      .from('scan_logs')
      .insert({
        driver_id,
        shipment_id: String(shipment_id),
        owner_user_id: owner_user_id,
        ml_account_id: foundAccount.id,
        scanned_code: String(shipment_id),
        resolved_from: 'qr_auto_multi',
        scanned_at: now,
      });

    // 8. Retornar sucesso com dados completos
    return new Response(
      JSON.stringify({ 
        success: true,
        shipment_id: String(shipment_id),
        status,
        substatus,
        tracking_number: tracking,
        order_id,
        last_ml_update: now,
        ml_account_id: foundAccount.id,
        account_nickname: foundAccount.nickname,
        message: `Pacote encontrado na conta ${foundAccount.nickname}`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[scan-bind-auto] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro ao processar código',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
