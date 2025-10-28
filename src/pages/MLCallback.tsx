import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function MLCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const error = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        if (error) {
          console.error("Erro do ML:", error, errorDescription);
          navigate(`/config-ml?status=error&message=${encodeURIComponent(errorDescription || error)}`);
          return;
        }

        if (!code || !state) {
          navigate("/config-ml?status=error&message=Código ou state ausente");
          return;
        }

        // Chamar função para trocar o code por tokens
        const { data, error: exchangeError } = await supabase.functions.invoke(
          "meli-exchange",
          {
            body: { code, state },
          }
        );

        if (exchangeError) {
          console.error("Erro ao trocar token:", exchangeError);
          navigate(`/config-ml?status=error&message=${encodeURIComponent(exchangeError.message)}`);
          return;
        }

        // Sucesso - redirecionar com nickname
        const nickname = data?.nickname || "Conta ML";
        navigate(`/config-ml?status=success&nickname=${encodeURIComponent(nickname)}`);
      } catch (error: any) {
        console.error("Erro no callback:", error);
        navigate(`/config-ml?status=error&message=${encodeURIComponent(error.message || "Erro desconhecido")}`);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Conectando sua conta...</h2>
        <p className="text-muted-foreground">Aguarde enquanto finalizamos a conexão</p>
      </div>
    </div>
  );
}
