import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;
const ML_REDIRECT_URI = Deno.env.get("ML_REDIRECT_URI")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== MELI-EXCHANGE: Troca de Code por Token ===");

    // Validar credenciais ML
    if (!ML_CLIENT_ID || !ML_CLIENT_SECRET || !ML_REDIRECT_URI) {
      throw new Error("Credenciais do Mercado Livre não configuradas");
    }

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autenticação não fornecido");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      throw new Error("Usuário não autenticado");
    }

    console.log("Usuário autenticado:", user.id);

    // Ler código e state
    const { code, state } = await req.json();

    if (!code || !state) {
      throw new Error("Código de autorização ou state não fornecido");
    }

    console.log("Code recebido:", code);
    console.log("State recebido:", state);

    // Validar state
    try {
      const [stateUserId, nonce, expStr] = state.split("|");
      const exp = parseInt(expStr, 10);

      if (stateUserId !== user.id) {
        throw new Error("State inválido: usuário não corresponde");
      }

      if (Date.now() > exp) {
        throw new Error("State expirado");
      }

      console.log("State validado com sucesso");
    } catch (error) {
      console.error("Erro ao validar state:", error);
      throw new Error("State inválido ou expirado");
    }

    // Trocar code por tokens
    console.log("Trocando code por access_token...");
    const tokenUrl = "https://api.mercadolibre.com/oauth/token";
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      code: code,
      redirect_uri: ML_REDIRECT_URI,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Erro ao trocar token:", errorText);
      throw new Error(`Erro do ML ao trocar token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Token recebido com sucesso");

    const { access_token, refresh_token, expires_in, user_id } = tokenData;

    if (!access_token || !refresh_token || !user_id) {
      throw new Error("Resposta do ML incompleta");
    }

    // Buscar dados do usuário ML
    console.log("Buscando dados do usuário ML...");
    const userResponse = await fetch(`https://api.mercadolibre.com/users/${user_id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Erro ao buscar usuário ML:", errorText);
      throw new Error("Erro ao buscar dados do usuário no ML");
    }

    const userData = await userResponse.json();
    console.log("Dados do usuário:", userData.nickname, userData.site_id);

    // Salvar no banco
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: dbError } = await supabaseClient
      .from("ml_accounts")
      .upsert(
        {
          ml_user_id: user_id,
          owner_user_id: user.id,
          access_token,
          refresh_token,
          expires_at: expiresAt,
          site_id: userData.site_id,
          nickname: userData.nickname,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "ml_user_id,owner_user_id",
        }
      );

    if (dbError) {
      console.error("Erro ao salvar no banco:", dbError);
      throw new Error(`Erro ao salvar conta: ${dbError.message}`);
    }

    console.log("✅ Conta ML vinculada com sucesso!");

    return new Response(
      JSON.stringify({ nickname: userData.nickname }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro em meli-exchange:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
