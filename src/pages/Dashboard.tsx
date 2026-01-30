import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, TrendingDown, Truck, AlertCircle, Clock, Loader2, RefreshCw, Search, ExternalLink, CheckCircle, ArrowRight, Wifi, WifiOff, Activity, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DiagnosticReportModal from "@/components/DiagnosticReportModal";
import SyncStatusModal, { useNextSyncTime } from "@/components/SyncStatusModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
interface DashboardStats {
  totalShipments: number;
  delivered: number;
  inRoute: number;
  notDelivered: number;
  toReturn: number;
  alertsPending: number;
  alertsInvestigating: number;
  alertsResolved: number;
  lastSync: string | null;
}

interface MlAccountHealth {
  id: string;
  nickname: string | null;
  ml_user_id: number;
  expires_at: string;
  status: 'valid' | 'expiring' | 'expired';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    delivered: 0,
    inRoute: 0,
    notDelivered: 0,
    toReturn: 0,
    alertsPending: 0,
    alertsInvestigating: 0,
    alertsResolved: 0,
    lastSync: null,
  });
  const [mlAccounts, setMlAccounts] = useState<MlAccountHealth[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingProblems, setIsCheckingProblems] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const nextSyncTime = useNextSyncTime();

  const { data: pendenciasData } = useQuery({
    queryKey: ['dashboard-pendencias'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pendencias_with_cache');
      if (error) throw error;
      
      const porMotorista = data.reduce((acc: any, item: any) => {
        if (!acc[item.driver_id]) {
          acc[item.driver_id] = {
            driver_name: item.driver_name,
            count: 0,
          };
        }
        acc[item.driver_id].count++;
        return acc;
      }, {});

      return {
        total: data.length,
        porMotorista: Object.values(porMotorista),
      };
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadStats();
    loadMlAccounts();
  }, [navigate]);

  const loadMlAccounts = async () => {
    const { data } = await supabase
      .from('ml_accounts')
      .select('id, nickname, ml_user_id, expires_at');

    if (data) {
      const now = new Date();
      const accounts: MlAccountHealth[] = data.map(acc => {
        const expiresAt = new Date(acc.expires_at);
        const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        let status: 'valid' | 'expiring' | 'expired' = 'valid';
        if (hoursUntilExpiry < 0) {
          status = 'expired';
        } else if (hoursUntilExpiry < 24) {
          status = 'expiring';
        }

        return {
          id: acc.id,
          nickname: acc.nickname,
          ml_user_id: acc.ml_user_id,
          expires_at: acc.expires_at,
          status,
        };
      });
      setMlAccounts(accounts);
    }
  };

  const loadStats = async () => {
    const { data: shipments } = await supabase
      .from("shipments_cache")
      .select("status, substatus, last_ml_update")
      .order("last_ml_update", { ascending: false })
      .limit(1000);

    if (shipments) {
      const delivered = shipments.filter((s) => s.status === "delivered").length;
      const inRoute = shipments.filter((s) => ["shipped", "out_for_delivery"].includes(s.status)).length;
      const notDelivered = shipments.filter((s) => s.status === "not_delivered").length;
      const toReturn = shipments.filter((s) => s.substatus === "returning_to_sender").length;
      const lastSync = shipments[0]?.last_ml_update || null;

      const { data: alerts } = await supabase
        .from("shipment_alerts")
        .select("status");

      const alertsPending = alerts?.filter((a) => a.status === "pending").length || 0;
      const alertsInvestigating = alerts?.filter((a) => a.status === "investigating").length || 0;
      const alertsResolved = alerts?.filter((a) => a.status === "resolved").length || 0;

      setStats({
        totalShipments: shipments.length,
        delivered,
        inRoute,
        notDelivered,
        toReturn,
        alertsPending,
        alertsInvestigating,
        alertsResolved,
        lastSync,
      });
    }
  };

  const handleAutoRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-refresh-shipments");
      if (error) throw error;
      toast.success(`✅ ${data.updated || 0} envios atualizados`);
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckProblems = async () => {
    setIsCheckingProblems(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-stuck-shipments");
      if (error) throw error;
      toast.success(`🔍 ${data.alertsCreated || 0} novos alertas criados`);
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Erro ao verificar problemas");
    } finally {
      setIsCheckingProblems(false);
    }
  };

  const handleSyncAllAccounts = async () => {
    setIsSyncingAll(true);
    try {
      toast.info('🔄 Sincronizando todas as contas ML...');
      const { data, error } = await supabase.functions.invoke("sync-all-accounts");
      if (error) throw error;
      toast.success(`✅ ${data.imported || 0} envios importados de ${data.accounts?.length || 0} contas`);
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Erro ao sincronizar contas");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleDiagnoseAlerts = async () => {
    setIsDiagnosing(true);
    setDiagnosticReport(null);
    setCleanupResult(null);
    try {
      toast.info('🔍 Analisando inconsistências...');
      const { data, error } = await supabase.functions.invoke("diagnose-alerts");
      if (error) throw error;
      setDiagnosticReport(data.report);
      toast.success('✅ Diagnóstico concluído!');
    } catch (error: any) {
      toast.error(error.message || "Erro ao executar diagnóstico");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleCleanupAlerts = async () => {
    setIsCleaning(true);
    setCleanupResult(null);
    try {
      toast.info('🧹 Executando limpeza...');
      const { data, error } = await supabase.functions.invoke("cleanup-alerts");
      if (error) throw error;
      setCleanupResult(data.result);
      toast.success(`✅ ${data.message}`);
      await loadStats();
      if (diagnosticReport) {
        setTimeout(() => handleDiagnoseAlerts(), 1000);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao executar limpeza");
    } finally {
      setIsCleaning(false);
    }
  };

  const statCards = [
    {
      title: "Total",
      value: stats.totalShipments,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Entregues",
      value: stats.delivered,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Em Rota",
      value: stats.inRoute,
      icon: Truck,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Não Entregues",
      value: stats.notDelivered,
      icon: TrendingDown,
      color: "text-danger",
      bgColor: "bg-danger/10",
    },
  ];

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="outline" className="border-success/50 text-success">Válido</Badge>;
      case 'expiring':
        return <Badge variant="outline" className="border-warning/50 text-warning">Expirando</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Layout>
        <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-title-lg md:text-display-md">Dashboard</h1>
          <p className="text-callout text-text-secondary">
            Visão geral das entregas Mercado Envios Flex
          </p>
        </div>

        {/* Stats Grid - Mobile optimized */}
        <div className="grid grid-cols-2 gap-ios-3 md:grid-cols-4 md:gap-ios-4">
          {statCards.map((stat, index) => (
            <Card key={index} variant="ios" className="ios-card-shadow animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-ios-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.bgColor} rounded-ios-md p-2`}>
                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-display-md font-bold">{stat.value}</div>
                <p className="text-footnote text-text-tertiary mt-0.5">
                  {stat.title}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Health Card */}
        <Card variant="ios" className="ios-card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-ios-2 text-title-sm">
              <div className="h-8 w-8 rounded-ios-md bg-primary/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              Saúde do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-ios-3">
              {/* Última Sincronização */}
              <div className="p-ios-3 rounded-ios-md bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-text-tertiary" />
                  <span className="text-caption1 text-text-tertiary">Última Sync</span>
                </div>
                <div className="text-callout font-medium">
                  {stats.lastSync
                      ? formatDistanceToNow(new Date(stats.lastSync), { addSuffix: true, locale: ptBR })
                      : "Nunca"
                    }
                  </div>
                </div>

              {/* Próxima Sync Auto */}
              <div className="p-ios-3 rounded-ios-md bg-primary/5">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <span className="text-caption1 text-text-tertiary">Próx. Sync Auto</span>
                </div>
                <div className="text-callout font-medium text-primary">{nextSyncTime}</div>
              </div>

                {/* Contas ML */}
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Contas ML</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{mlAccounts.length}</span>
                    {mlAccounts.some(a => a.status === 'expired') && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">
                        {mlAccounts.filter(a => a.status === 'expired').length} expirada
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Alertas */}
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Alertas Pendentes</span>
                  </div>
                  <div className="text-sm font-medium text-danger">{stats.alertsPending}</div>
                </div>

                {/* Pendências */}
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Pendências</span>
                  </div>
                  <div className="text-sm font-medium">{pendenciasData?.total || 0}</div>
                </div>
              </div>

              {/* Contas ML Detalhes */}
              {mlAccounts.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Contas Mercado Livre</p>
                  <div className="space-y-2">
                    {mlAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between py-1">
                        <span className="text-sm">{account.nickname || `ML ${account.ml_user_id}`}</span>
                        {getAccountStatusBadge(account.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Alerts & Pending - Mobile cards */}
        <div className="grid gap-ios-4 md:grid-cols-2">
          {/* Alerts Card */}
          <Card variant="ios" className="ios-card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-ios-2 text-title-sm">
                <div className="h-8 w-8 rounded-ios-md bg-danger/10 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-danger" />
                </div>
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-ios-4">
              <div className="grid grid-cols-3 gap-ios-3">
                <div className="text-center p-ios-3 rounded-ios-md bg-danger/5">
                  <div className="text-title-lg font-bold text-danger">{stats.alertsPending}</div>
                  <p className="text-caption2 text-text-tertiary mt-0.5">Pendentes</p>
                </div>
                <div className="text-center p-ios-3 rounded-ios-md bg-secondary/5">
                  <div className="text-title-lg font-bold text-secondary">{stats.alertsInvestigating}</div>
                  <p className="text-caption2 text-text-tertiary mt-0.5">Investigando</p>
                </div>
                <div className="text-center p-ios-3 rounded-ios-md bg-success/5">
                  <div className="text-title-lg font-bold text-success">{stats.alertsResolved}</div>
                  <p className="text-caption2 text-text-tertiary mt-0.5">Resolvidos</p>
                </div>
              </div>
              <Button asChild variant="ios-primary" size="ios-default" className="w-full ios-pressed">
                  <Link to="/operacoes">
                    Ver Operações
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

          {/* Pending Card */}
          <Card variant="ios" className="ios-card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-ios-2 text-title-sm">
                <div className="h-8 w-8 rounded-ios-md bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                Pendências
              </CardTitle>
            </CardHeader>
            <CardContent>
                {pendenciasData ? (
                <div className="space-y-ios-4">
                  <div className="flex items-baseline gap-2">
                    <div className="text-display-lg font-bold">{pendenciasData.total}</div>
                    <p className="text-callout text-text-secondary">pacotes com motoristas</p>
                  </div>
                  
                  {pendenciasData.porMotorista.length > 0 && (
                    <div className="space-y-2 pt-ios-3 border-t border-border-subtle">
                      {(pendenciasData.porMotorista as any[]).slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <span className="text-callout truncate">{item.driver_name}</span>
                          <Badge variant="secondary" className="rounded-ios-full">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button asChild variant="outline" size="ios-default" className="w-full ios-pressed rounded-ios-md">
                    <Link to="/rastreamento?tab=pendentes">
                      Ver Detalhes
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Maintenance Actions - FASE 2: Consolidado em 2 botões */}
          <Card variant="ios" className="ios-card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-ios-2 text-title-sm">
                <div className="h-8 w-8 rounded-ios-md bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                Manutenção
              </CardTitle>
              <p className="text-callout text-text-secondary mt-1">
                Ações rápidas para manter o sistema atualizado
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-ios-3">
                <Button
                  onClick={() => setSyncModalOpen(true)}
                  disabled={isSyncingAll}
                  variant="ios-primary"
                  className="h-auto py-ios-5 flex-col gap-2 rounded-ios-lg ios-pressed"
                >
                  <RefreshCw className="h-6 w-6" />
                  <span className="text-callout font-medium">Sincronizar Tudo</span>
                  <span className="text-caption2 text-text-tertiary">Importar + Atualizar</span>
                </Button>

                <Button
                  onClick={async () => {
                    setIsCheckingProblems(true);
                    try {
                      toast.info('🔍 Verificando...');
                      // Verificar problemas + diagnosticar + limpar
                      await supabase.functions.invoke("check-stuck-shipments");
                      const { data } = await supabase.functions.invoke("cleanup-alerts");
                      toast.success(`✅ Verificação concluída! ${data?.message || ''}`);
                      await loadStats();
                    } catch (error: any) {
                      toast.error(error.message || "Erro ao verificar");
                    } finally {
                      setIsCheckingProblems(false);
                    }
                  }}
                  disabled={isCheckingProblems}
                  variant="ios-secondary"
                  className="h-auto py-ios-5 flex-col gap-2 rounded-ios-lg ios-pressed"
                >
                  {isCheckingProblems ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-success" />
                  )}
                  <span className="text-callout font-medium">Verificar e Corrigir</span>
                  <span className="text-caption2 text-text-tertiary">Detectar + Resolver</span>
                </Button>
              </div>
              
              <div className="mt-ios-4 p-ios-3 bg-muted/50 rounded-ios-md">
                <p className="text-footnote text-text-secondary">
                  💡 <strong>Sincronizar Tudo:</strong> Importa novos pedidos dos últimos 7 dias e atualiza status.<br/>
                  <strong>Verificar e Corrigir:</strong> Detecta problemas e resolve inconsistências automaticamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>

      {/* Sync Status Modal */}
      <SyncStatusModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
        onComplete={() => loadStats()}
      />

      {/* Diagnostic Modal */}
      <DiagnosticReportModal
        open={!!diagnosticReport}
        onOpenChange={(open) => !open && setDiagnosticReport(null)}
        report={diagnosticReport}
        cleanupResult={cleanupResult}
        onCleanup={handleCleanupAlerts}
        isCleaning={isCleaning}
      />
    </>
  );
}
