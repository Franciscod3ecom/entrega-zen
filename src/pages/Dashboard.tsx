import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, TrendingDown, Truck, AlertCircle, Clock, Loader2, RefreshCw, Search, ExternalLink, CheckCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DiagnosticReportModal from "@/components/DiagnosticReportModal";

interface DashboardStats {
  totalShipments: number;
  delivered: number;
  inRoute: number;
  notDelivered: number;
  toReturn: number;
  alertsPending: number;
  alertsInvestigating: number;
  alertsResolved: number;
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
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingProblems, setIsCheckingProblems] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

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
  }, [navigate]);

  const loadStats = async () => {
    const { data: shipments } = await supabase
      .from("shipments_cache")
      .select("status, substatus");

    if (shipments) {
      const delivered = shipments.filter((s) => s.status === "delivered").length;
      const inRoute = shipments.filter((s) => ["shipped", "out_for_delivery"].includes(s.status)).length;
      const notDelivered = shipments.filter((s) => s.status === "not_delivered").length;
      const toReturn = shipments.filter((s) => s.substatus === "returning_to_sender").length;

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

  const handleSyncOrders = async () => {
    setIsRefreshing(true);
    try {
      const { data: mlAccount } = await supabase
        .from('ml_accounts')
        .select('ml_user_id')
        .limit(1)
        .maybeSingle();

      if (!mlAccount) {
        toast.error('Nenhuma conta ML conectada');
        return;
      }

      toast.info('Importando histórico de pedidos...');

      const { data, error } = await supabase.functions.invoke("sync-orders-initial", {
        body: { ml_user_id: mlAccount.ml_user_id }
      });
      
      if (error) throw error;
      toast.success(`✅ ${data.imported || 0} pedidos importados`);
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar histórico");
    } finally {
      setIsRefreshing(false);
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

  return (
    <>
      <Layout>
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Visão geral das entregas Mercado Envios Flex
            </p>
          </div>

          {/* Stats Grid - Mobile optimized */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {statCards.map((stat, index) => (
              <Card key={index} className="border-0 shadow-md rounded-2xl overflow-hidden animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`${stat.bgColor} rounded-xl p-2`}>
                      <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stat.title}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alerts & Pending - Mobile cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Alerts Card */}
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-8 w-8 rounded-xl bg-danger/10 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-danger" />
                  </div>
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-danger/5">
                    <div className="text-2xl font-bold text-danger">{stats.alertsPending}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Pendentes</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-secondary/5">
                    <div className="text-2xl font-bold text-secondary">{stats.alertsInvestigating}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Investigando</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-success/5">
                    <div className="text-2xl font-bold text-success">{stats.alertsResolved}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Resolvidos</p>
                  </div>
                </div>
                <Button asChild className="w-full h-11 rounded-xl">
                  <Link to="/operacoes">
                    Ver Operações
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pending Card */}
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  Pendências
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendenciasData ? (
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <div className="text-4xl font-bold">{pendenciasData.total}</div>
                      <p className="text-sm text-muted-foreground">pacotes com motoristas</p>
                    </div>
                    
                    {pendenciasData.porMotorista.length > 0 && (
                      <div className="space-y-2 pt-3 border-t">
                        {(pendenciasData.porMotorista as any[]).slice(0, 3).map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between py-1">
                            <span className="text-sm truncate">{item.driver_name}</span>
                            <Badge variant="secondary" className="rounded-lg">{item.count}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button asChild variant="outline" className="w-full h-11 rounded-xl">
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

          {/* Maintenance Actions */}
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                Manutenção
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Ações para manter os dados atualizados
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Button
                  onClick={handleAutoRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 rounded-xl touch-feedback"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-5 w-5" />
                  )}
                  <span className="text-xs font-medium">Atualizar Status</span>
                </Button>

                <Button
                  onClick={handleCheckProblems}
                  disabled={isCheckingProblems}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 rounded-xl touch-feedback"
                >
                  {isCheckingProblems ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                  <span className="text-xs font-medium">Verificar Problemas</span>
                </Button>

                <Button
                  onClick={handleSyncOrders}
                  disabled={isRefreshing}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 rounded-xl touch-feedback"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-5 w-5" />
                  )}
                  <span className="text-xs font-medium">Importar Pedidos</span>
                </Button>

                <Button
                  onClick={handleDiagnoseAlerts}
                  disabled={isDiagnosing}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 rounded-xl touch-feedback"
                >
                  {isDiagnosing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-warning" />
                  )}
                  <span className="text-xs font-medium">Diagnosticar</span>
                </Button>

                <Button
                  onClick={handleCleanupAlerts}
                  disabled={isCleaning || isDiagnosing}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 rounded-xl touch-feedback col-span-2 md:col-span-1"
                >
                  {isCleaning ? (
                    <Loader2 className="h-5 w-5 animate-spin text-success" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-success" />
                  )}
                  <span className="text-xs font-medium">Corrigir Inconsistências</span>
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground">
                  💡 Execute "Atualizar Status" a cada 2-4h e "Verificar Problemas" 1x/dia
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>

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
