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
    
    // Extrair usuário do JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Token inválido');
    }

    const loggedUserId = user.id;
    
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

    // ============================================
    // NOVA LÓGICA: Descobrir operation_owner_user_id
    // Se for motorista, usa o owner_user_id do cadastro do motorista
    // Se não for motorista, usa o próprio user.id
    // ============================================
    
    let operation_owner_user_id = loggedUserId;
    
    // Checar se o usuário logado tem role 'driver'
    const { data: driverRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', loggedUserId)
      .eq('role', 'driver')
      .maybeSingle();
    
    const isDriverUser = !!driverRole;
    
    if (isDriverUser) {
      console.log(`[scan-bind-auto] Usuário ${loggedUserId} é motorista, buscando owner da operação...`);
      
      // Buscar o registro do motorista pelo driver_id enviado no request
      const { data: driverRecord, error: driverError } = await supabase
        .from('drivers')
        .select('id, user_id, owner_user_id, active')
        .eq('id', driver_id)
        .maybeSingle();
      
      if (driverError) {
        console.error('[scan-bind-auto] Erro ao buscar motorista:', driverError);
        throw new Error('Erro ao validar motorista');
      }
      
      if (!driverRecord) {
        throw new Error('Motorista não encontrado');
      }
      
      // Validar segurança: o driver_id deve pertencer ao usuário logado
      if (driverRecord.user_id !== loggedUserId) {
        console.error(`[scan-bind-auto] SEGURANÇA: Usuário ${loggedUserId} tentou usar driver_id ${driver_id} que pertence a ${driverRecord.user_id}`);
        throw new Error('Não autorizado: motorista não pertence a este usuário');
      }
      
      if (!driverRecord.active) {
        throw new Error('Motorista inativo');
      }
      
      // Usar o owner_user_id da operação (admin que criou o motorista)
      operation_owner_user_id = driverRecord.owner_user_id;
      console.log(`[scan-bind-auto] ✓ Motorista validado. Usando owner da operação: ${operation_owner_user_id}`);
    }

    console.log(`[scan-bind-auto] Iniciando busca multi-conta para shipment: ${shipment_id} (operation_owner: ${operation_owner_user_id}, logged_user: ${loggedUserId}, is_driver: ${isDriverUser})`);

    // 1. Buscar todas as contas ML ativas do DONO DA OPERAÇÃO (não do usuário logado)
    const { data: mlAccounts, error: accountsError } = await supabase
      .from('ml_accounts')
      .select('id, ml_user_id, nickname, owner_user_id')
      .eq('owner_user_id', operation_owner_user_id);

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
        
        const data = await mlGet(`/shipments/${shipment_id}`, {}, Number(account.ml_user_id));
        
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
      throw new Error(`Este código (${shipment_id}) não foi encontrado em nenhuma das contas do Mercado Livre. Verifique a etiqueta.`);
    }

    // 4. Processar shipment encontrado (mesma lógica do scan-bind)
    const status = shipmentData.status || '';
    const substatus = shipmentData.substatus || '';
    const tracking = shipmentData.tracking_number || null;
    const order_id = shipmentData.order_id ? String(shipmentData.order_id) : null;
    const now = new Date().toISOString();

    // 5. Buscar dados atuais do cache para merge inteligente
    const { data: currentCache } = await supabase
      .from('shipments_cache')
      .select('*')
      .eq('shipment_id', String(shipment_id))
      .maybeSingle();

    // 6. Fazer MERGE inteligente - USAR operation_owner_user_id
    const mergedData = {
      shipment_id: String(shipment_id),
      owner_user_id: operation_owner_user_id,  // ← CORRIGIDO: usa o owner da operação
      ml_account_id: foundAccount.id,
      
      // ✅ Preservar dados existentes se API retornar null
      order_id: order_id || currentCache?.order_id || null,
      tracking_number: tracking || currentCache?.tracking_number || null,
      
      status,
      substatus,
      
      // ✅ Merge de raw_data
      raw_data: {
        ...(currentCache?.raw_data as Record<string, any> || {}),
        ...shipmentData,
        _scan_bind_at: now,
      },
      
      last_ml_update: now,
    };

    console.log('[scan-bind-auto] Merge inteligente:', {
      preservou_order: mergedData.order_id === currentCache?.order_id,
      preservou_tracking: mergedData.tracking_number === currentCache?.tracking_number,
      operation_owner_user_id,
    });

    // 7. Upsert em shipments_cache com dados mesclados
    const { error: cacheError } = await supabase
      .from('shipments_cache')
      .upsert(mergedData, {
        onConflict: 'shipment_id'
      });

    if (cacheError) {
      console.error('[scan-bind-auto] Erro ao atualizar cache:', cacheError);
      throw cacheError;
    }

    console.log(`[scan-bind-auto] ✓ Cache atualizado`);

    // 8. Verificar duplicatas - impedir que outro motorista tenha o mesmo pacote
    // USAR operation_owner_user_id para buscar assignments
    const { data: anyAssignment } = await supabase
      .from('driver_assignments')
      .select('*, driver:drivers(name, phone)')
      .eq('shipment_id', String(shipment_id))
      .eq('owner_user_id', operation_owner_user_id)  // ← CORRIGIDO
      .is('returned_at', null)  // Apenas assignments ativos
      .maybeSingle();

    if (anyAssignment) {
      // Se já existe assignment ativo
      if (anyAssignment.driver_id !== driver_id) {
        // ❌ ERRO: Outro motorista já tem este pacote
        const otherDriver = anyAssignment.driver as any;
        console.error(`[scan-bind-auto] ❌ DUPLICATA BLOQUEADA: Pacote ${shipment_id} já atribuído ao motorista ${otherDriver?.name}`);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Este pacote já está com outro motorista: ${otherDriver?.name || 'Desconhecido'}${otherDriver?.phone ? ` (${otherDriver.phone})` : ''}`,
            code: 'DUPLICATE_ASSIGNMENT',
            current_driver: {
              id: anyAssignment.driver_id,
              name: otherDriver?.name,
              phone: otherDriver?.phone,
              assigned_at: anyAssignment.assigned_at,
              scanned_at: anyAssignment.scanned_at,
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409  // Conflict
          }
        );
      }

      // ✅ Mesmo motorista - apenas atualizar scanned_at
      const { error: updateError } = await supabase
        .from('driver_assignments')
        .update({ scanned_at: now })
        .eq('id', anyAssignment.id);

      if (updateError) throw updateError;
      console.log(`[scan-bind-auto] ✓ Assignment atualizado (mesmo motorista): ${anyAssignment.id}`);
    } else {
      // ✅ Nenhum assignment ativo - criar novo COM operation_owner_user_id
      const { error: insertError } = await supabase
        .from('driver_assignments')
        .insert({
          driver_id,
          shipment_id: String(shipment_id),
          owner_user_id: operation_owner_user_id,  // ← CORRIGIDO
          ml_account_id: foundAccount.id,
          assigned_at: now,
          scanned_at: now,
        });

      if (insertError) throw insertError;
      console.log(`[scan-bind-auto] ✓ Novo assignment criado com owner ${operation_owner_user_id}`);
    }

    // 9. Registrar em scan_logs COM operation_owner_user_id
    await supabase
      .from('scan_logs')
      .insert({
        driver_id,
        shipment_id: String(shipment_id),
        owner_user_id: operation_owner_user_id,  // ← CORRIGIDO
        ml_account_id: foundAccount.id,
        scanned_code: String(shipment_id),
        resolved_from: 'qr_auto_multi',
        scanned_at: now,
      });

    // 10. Retornar sucesso com dados completos
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
