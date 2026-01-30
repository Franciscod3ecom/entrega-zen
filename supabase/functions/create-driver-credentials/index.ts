import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get caller's JWT to verify permissions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is admin or ops
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await supabaseAnon.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller has admin or ops role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const hasPermission = roles?.some(
      (r) => r.role === "admin" || r.role === "ops"
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Sem permissão. Apenas admin/ops podem criar credenciais." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { driver_id, email, password } = await req.json();

    // Validate inputs
    if (!driver_id || !email || !password) {
      return new Response(
        JSON.stringify({ error: "driver_id, email e password são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if driver exists and doesn't already have access
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("drivers")
      .select("id, name, user_id, owner_user_id")
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) {
      console.error("Driver not found:", driverError);
      return new Response(
        JSON.stringify({ error: "Motorista não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (driver.user_id) {
      return new Response(
        JSON.stringify({ error: "Motorista já possui acesso ao portal" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is already in use
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "Este email já está em uso" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating credentials for driver ${driver_id} (${driver.name})`);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: driver.name,
        is_driver: true,
      },
    });

    if (authError || !authData.user) {
      console.error("Error creating auth user:", authError);
      return new Response(
        JSON.stringify({ error: authError?.message || "Erro ao criar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;
    console.log(`Auth user created: ${newUserId}`);

    // 2. Create profile for the new user
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        name: driver.name,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't fail the whole operation, profile trigger might have created it
    }

    // 3. Add 'driver' role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: "driver",
      });

    if (roleError) {
      console.error("Error adding role:", roleError);
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar role de motorista" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Driver role added for user: ${newUserId}`);

    // 4. Update driver record with user_id and email
    const { error: updateError } = await supabaseAdmin
      .from("drivers")
      .update({
        user_id: newUserId,
        email: email,
        invite_token: null,
        invite_expires_at: null,
      })
      .eq("id", driver_id);

    if (updateError) {
      console.error("Error updating driver:", updateError);
      // Rollback: delete the auth user and role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Erro ao vincular motorista" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Driver ${driver_id} linked to user ${newUserId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Credenciais criadas com sucesso",
        driver_name: driver.name,
        email: email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
