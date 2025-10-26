import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Layout from "@/components/Layout";

export default function ConfigML() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkConnection();

    // Verificar parâmetros de retorno do OAuth
    const mlConnected = searchParams.get('ml_connected');
    const mlError = searchParams.get('ml_error');

    if (mlConnected === 'true') {
      toast({
        title: "Sucesso!",
        description: "Conta do Mercado Livre conectada com sucesso!",
      });
      checkConnection();
    }

    if (mlError) {
      toast({
        title: "Erro na conexão",
        description: decodeURIComponent(mlError),
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('ml_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsConnected(true);
        setConnectionInfo(data);
      } else {
        setIsConnected(false);
        setConnectionInfo(null);
      }
    } catch (error: any) {
      console.error('Erro ao verificar conexão:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('meli-auth');

      if (error) throw error;

      if (data?.authorization_url) {
        // Redirecionar para autorização do ML
        window.location.href = data.authorization_url;
      } else {
        throw new Error('URL de autorização não recebida');
      }
    } catch (error: any) {
      console.error('Erro ao iniciar OAuth:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao conectar com Mercado Livre",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuração Mercado Livre</h1>
          <p className="text-muted-foreground">
            Configure a integração com sua conta do Mercado Livre
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Status da Conexão</CardTitle>
              <CardDescription>
                Verificação da integração com o Mercado Livre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected ? (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Conectado com sucesso!</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Vendedor: {connectionInfo?.seller_nickname}</p>
                      <p>Site: {connectionInfo?.site_id}</p>
                      <p>User ID: {connectionInfo?.user_id}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    <strong>Não conectado</strong>
                    <p className="mt-1 text-sm">
                      Você precisa conectar sua conta do Mercado Livre para usar as integrações.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                onClick={handleConnect}
                disabled={isLoading}
                variant={isConnected ? "outline" : "default"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                <span className="ml-2">
                  {isConnected ? 'Reconectar' : 'Conectar com Mercado Livre'}
                </span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
              <CardDescription>
                Entenda o processo de integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Clique no botão "Conectar com Mercado Livre"</li>
                <li>Você será redirecionado para o Mercado Livre</li>
                <li>Faça login e autorize o RASTREIO_FLEX</li>
                <li>Será redirecionado de volta automaticamente</li>
                <li>A conexão estará pronta para uso!</li>
              </ol>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Importante:</strong> O RASTREIO_FLEX terá acesso apenas aos dados de envios e pedidos. 
                  Nenhuma informação sensível será coletada.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
