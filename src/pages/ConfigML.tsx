import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, CheckCircle, AlertCircle, RefreshCw, Clock, XCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Layout from "@/components/Layout";

const MAX_ML_ACCOUNTS = 5;

interface MLAccount {
  id: string;
  nickname: string | null;
  site_id: string;
  ml_user_id: number;
  expires_at: string;
  updated_at: string;
  created_at: string;
}

type TokenStatus = 'valid' | 'expiring' | 'expired';

function getTokenStatus(expiresAt: string): TokenStatus {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilExpiry <= 0) return 'expired';
  if (hoursUntilExpiry <= 24) return 'expiring';
  return 'valid';
}

function getStatusBadge(status: TokenStatus) {
  switch (status) {
    case 'valid':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Válido
        </Badge>
      );
    case 'expiring':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Expirando
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Expirado
        </Badge>
      );
  }
}

function formatExpiryTime(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    const hoursAgo = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
    if (hoursAgo < 24) return `Expirou há ${hoursAgo}h`;
    const daysAgo = Math.floor(hoursAgo / 24);
    return `Expirou há ${daysAgo} dias`;
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `Expira em ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Expira em ${days} dias`;
}

export default function ConfigML() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mlAccounts, setMlAccounts] = useState<MLAccount[]>([]);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkConnection();

    const status = searchParams.get('status');
    const nickname = searchParams.get('nickname');
    const message = searchParams.get('message');

    if (status === 'success') {
      toast({
        title: "✅ Sucesso!",
        description: nickname 
          ? `Conta ${nickname} conectada com sucesso!`
          : "Conta do Mercado Livre conectada!",
      });
      window.history.replaceState({}, '', '/config-ml');
      checkConnection();
      setIsLoading(false);
    } else if (status === 'error') {
      toast({
        title: "❌ Erro na Autenticação",
        description: message || "Não foi possível conectar a conta.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/config-ml');
      setIsLoading(false);
    }
  }, [searchParams]);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('ml_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMlAccounts(data || []);
    } catch (error: any) {
      console.error('Erro ao verificar conexão:', error);
    }
  };

  const handleConnect = async () => {
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Você precisa estar autenticado para conectar uma conta do Mercado Livre. Faça login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('meli-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao iniciar processo de autorização');
      }

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('URL de autorização não recebida da API');
      }
    } catch (error: any) {
      toast({
        title: "Erro na Conexão",
        description: error.message || "Erro ao conectar com Mercado Livre",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleReconnect = async (accountId: string, nickname: string | null) => {
    // Primeiro remove a conta antiga
    try {
      const { error } = await supabase
        .from('ml_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Reconectando...",
        description: `Removida conta ${nickname || 'antiga'}. Inicie a reconexão.`,
      });
      
      checkConnection();
      
      // Inicia novo fluxo OAuth
      handleConnect();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao preparar reconexão",
        variant: "destructive",
      });
    }
  };

  const handleRefreshTokens = async () => {
    setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('refresh-ml-tokens');
      
      if (error) throw error;
      
      const { summary } = data || {};
      
      toast({
        title: "Tokens Atualizados",
        description: `${summary?.success || 0} sucesso, ${summary?.failed || 0} falhas`,
      });
      
      checkConnection();
    } catch (error: any) {
      toast({
        title: "Erro ao Atualizar",
        description: error.message || "Erro ao renovar tokens",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('ml_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta do Mercado Livre removida",
      });
      
      checkConnection();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover conta",
        variant: "destructive",
      });
    }
  };

  const expiredCount = mlAccounts.filter(a => getTokenStatus(a.expires_at) === 'expired').length;
  const expiringCount = mlAccounts.filter(a => getTokenStatus(a.expires_at) === 'expiring').length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuração Mercado Livre</h1>
            <p className="text-muted-foreground">
              Configure a integração com suas contas do Mercado Livre
            </p>
          </div>
          
          {mlAccounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshTokens}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar Tokens
            </Button>
          )}
        </div>

        {expiredCount > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{expiredCount} conta(s) com token expirado!</strong> Essas contas precisam ser reconectadas manualmente.
            </AlertDescription>
          </Alert>
        )}

        {expiringCount > 0 && expiredCount === 0 && (
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>{expiringCount} conta(s) com token expirando em breve.</strong> O sistema tentará renovar automaticamente.
            </AlertDescription>
          </Alert>
        )}

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
                {mlAccounts.map((account) => {
                  const status = getTokenStatus(account.expires_at);
                  const isExpired = status === 'expired';
                  
                  return (
                    <div 
                      key={account.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg bg-card ${
                        isExpired ? 'border-red-300 dark:border-red-800' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {status === 'valid' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : status === 'expiring' ? (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{account.nickname}</p>
                            {getStatusBadge(status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Site: {account.site_id} • ML ID: {account.ml_user_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatExpiryTime(account.expires_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReconnect(account.id, account.nickname)}
                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reconectar
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveAccount(account.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={isLoading || mlAccounts.length >= MAX_ML_ACCOUNTS}
              variant={mlAccounts.length > 0 ? "outline" : "default"}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              <span className="ml-2">
                {mlAccounts.length >= MAX_ML_ACCOUNTS 
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
                  <strong>Renovação Automática:</strong> Os tokens são renovados automaticamente a cada 6 horas. 
                  Se um token expirar, você verá o status "Expirado" e poderá reconectar manualmente.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status dos Tokens</CardTitle>
              <CardDescription>
                Entenda os indicadores de status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusBadge('valid')}
                <span className="text-sm">Token funcionando normalmente</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge('expiring')}
                <span className="text-sm">Expira em menos de 24h (renovação automática)</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge('expired')}
                <span className="text-sm">Precisa reconectar manualmente</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
