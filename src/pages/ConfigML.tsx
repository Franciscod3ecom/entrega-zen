import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useMLAccount } from "@/contexts/MLAccountContext";
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Layout from "@/components/Layout";

const MAX_ML_ACCOUNTS = 5;

export default function ConfigML() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { refreshAccounts } = useMLAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [mlAccounts, setMlAccounts] = useState<any[]>([]);
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
      refreshAccounts(); // Atualizar contexto
    }

    if (mlError) {
      toast({
        title: "Erro na conexão",
        description: decodeURIComponent(mlError),
        variant: "destructive",
      });
    }
  }, [searchParams, currentTenant]);

  const checkConnection = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('ml_accounts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMlAccounts(data || []);
    } catch (error: any) {
      console.error('Erro ao verificar conexão:', error);
    }
  };

  const handleConnect = async () => {
    // Validação mais robusta do tenant
    if (tenantLoading) {
      toast({
        title: "Aguarde",
        description: "Carregando informações do workspace...",
        variant: "default",
      });
      return;
    }

    if (!currentTenant?.id) {
      toast({
        title: "Erro de Configuração",
        description: "Nenhum workspace selecionado. Tente fazer login novamente.",
        variant: "destructive",
      });
      return;
    }

    if (mlAccounts.length >= MAX_ML_ACCOUNTS) {
      toast({
        title: "Limite atingido",
        description: `Você já possui ${MAX_ML_ACCOUNTS} contas conectadas. Remova uma conta antes de adicionar outra.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Iniciando conexão ML para tenant:', currentTenant.id);
      
      const { data, error } = await supabase.functions.invoke('meli-auth', {
        body: { tenant_id: currentTenant.id }
      });

      if (error) {
        console.error('Erro na função meli-auth:', error);
        throw error;
      }

      if (data?.authorization_url) {
        console.log('Redirecionando para autorização ML...');
        window.location.href = data.authorization_url;
      } else {
        throw new Error('URL de autorização não recebida da API');
      }
    } catch (error: any) {
      console.error('Erro ao iniciar OAuth ML:', error);
      
      // Diferenciar tipos de erro
      let errorMessage = error.message || "Erro ao conectar com Mercado Livre";
      
      if (errorMessage.includes('tenant_id')) {
        errorMessage = "Erro de configuração do workspace. Tente fazer logout e login novamente.";
      } else if (errorMessage.includes('authorization_url')) {
        errorMessage = "Erro ao obter URL de autorização. Verifique se as credenciais do Mercado Livre estão configuradas corretamente.";
      }
      
      toast({
        title: "Erro na Conexão",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('ml_accounts')
        .delete()
        .eq('id', accountId)
        .eq('tenant_id', currentTenant?.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta do Mercado Livre removida",
      });
      
      checkConnection();
      refreshAccounts(); // Atualizar contexto
    } catch (error: any) {
      console.error('Erro ao remover conta:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover conta",
        variant: "destructive",
      });
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Contas Conectadas ({mlAccounts.length}/{MAX_ML_ACCOUNTS})</CardTitle>
            <CardDescription>
              Gerencie suas contas do Mercado Livre
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mlAccounts.length === 0 ? (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <strong>Nenhuma conta conectada</strong>
                  <p className="mt-1 text-sm">
                    Você precisa conectar uma conta do Mercado Livre para usar as integrações.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {mlAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{account.nickname}</p>
                        <p className="text-sm text-muted-foreground">
                          Site: {account.site_id} • ML ID: {account.ml_user_id}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveAccount(account.id)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={isLoading || tenantLoading || !currentTenant || mlAccounts.length >= MAX_ML_ACCOUNTS}
              variant={mlAccounts.length > 0 ? "outline" : "default"}
            >
              {(isLoading || tenantLoading) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              <span className="ml-2">
                {tenantLoading 
                  ? 'Carregando...'
                  : mlAccounts.length >= MAX_ML_ACCOUNTS 
                    ? `Limite de ${MAX_ML_ACCOUNTS} contas atingido`
                    : mlAccounts.length > 0 
                      ? 'Adicionar outra conta' 
                      : 'Conectar com Mercado Livre'}
              </span>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">

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
