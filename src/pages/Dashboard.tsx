import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, TrendingDown, Truck, AlertCircle, Clock, Loader2, RefreshCw, Search, ExternalLink } from "lucide-react";
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

  const { data: pendenciasData } = useQuery({
    queryKey: ['dashboard-pendencias'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pendencias_with_cache');
      if (error) throw error;
      
      // Agrupar por motorista
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
    // Usar shipments_cache ao invés de shipments
    const { data: shipments } = await supabase
      .from("shipments_cache")
      .select("status, substatus");

    if (shipments) {
      const delivered = shipments.filter((s) => s.status === "delivered").length;
      const inRoute = shipments.filter((s) => ["shipped", "out_for_delivery"].includes(s.status)).length;
      const notDelivered = shipments.filter((s) => s.status === "not_delivered").length;
      const toReturn = shipments.filter((s) => s.substatus === "returning_to_sender").length;

      // Buscar alertas
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

      toast.success(`✅ ${data.updated || 0} envios atualizados, ${data.errors || 0} erros`);
      await loadStats();
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
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
      console.error("Erro ao verificar problemas:", error);
      toast.error(error.message || "Erro ao verificar problemas");
    } finally {
      setIsCheckingProblems(false);
    }
  };

  const handleSyncOrders = async () => {
    setIsRefreshing(true);
    try {
      // Buscar primeira conta ML do usuário
      const { data: mlAccount } = await supabase
        .from('ml_accounts')
        .select('ml_user_id')
        .limit(1)
        .maybeSingle();

      if (!mlAccount) {
        toast.error('Nenhuma conta ML conectada');
        return;
      }

      toast.info('Importando histórico de pedidos... Isso pode levar alguns minutos.');

      const { data, error } = await supabase.functions.invoke("sync-orders-initial", {
        body: { ml_user_id: mlAccount.ml_user_id }
      });
      
      if (error) throw error;

      toast.success(`✅ ${data.imported || 0} pedidos importados, ${data.errors || 0} erros`);
      await loadStats();
    } catch (error: any) {
      console.error("Erro ao importar histórico:", error);
      toast.error(error.message || "Erro ao importar histórico");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDiagnoseAlerts = async () => {
    setIsDiagnosing(true);
    try {
      toast.info('🔍 Analisando inconsistências...');

      const { data, error } = await supabase.functions.invoke("diagnose-alerts");
      
      if (error) throw error;

      setDiagnosticReport(data.report);
      toast.success('✅ Diagnóstico concluído!');
    } catch (error: any) {
      console.error("Erro no diagnóstico:", error);
      toast.error(error.message || "Erro ao executar diagnóstico");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const statCards = [
    {
      title: "Total de Envios",
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
    {
      title: "A Devolver",
      value: stats.toReturn,
      icon: AlertCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das entregas Mercado Envios Flex
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, index) => (
            <Card key={index} className="transition-smooth hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} rounded-lg p-2`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.value > 0 
                    ? `${((stat.value / stats.totalShipments) * 100).toFixed(1)}% do total`
                    : "Nenhum registro"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Card de Alertas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-danger">{stats.alertsPending}</div>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-secondary">{stats.alertsInvestigating}</div>
                    <p className="text-xs text-muted-foreground">Em Investigação</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-success">{stats.alertsResolved}</div>
                    <p className="text-xs text-muted-foreground">Resolvidos</p>
                  </div>
                </div>
                
                <Button asChild className="w-full">
                  <Link to="/alertas">Ver Todos os Alertas →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card de Pendências */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pendências Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendenciasData ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-4xl font-bold">{pendenciasData.total}</div>
                    <p className="text-sm text-muted-foreground">
                      pacotes com motoristas
                    </p>
                  </div>
                  
                  {pendenciasData.porMotorista.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-sm font-medium">Por motorista:</p>
                      {(pendenciasData.porMotorista as any[]).map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{item.driver_name}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button asChild className="w-full mt-4">
                    <Link to="/rastreamento?tab=pendentes">Ver Detalhes →</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Carregando...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Card de Manutenção do Sistema */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Manutenção do Sistema
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Execute essas ações periodicamente para manter os dados atualizados
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                onClick={handleAutoRefresh}
                disabled={isRefreshing}
                variant="outline"
                className="h-auto py-6 flex-col items-start gap-2"
              >
                {isRefreshing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
                <div className="text-left">
                  <div className="font-semibold">Atualizar Status</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Consulta ML API e atualiza até 100 envios ativos
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleCheckProblems}
                disabled={isCheckingProblems}
                variant="outline"
                className="h-auto py-6 flex-col items-start gap-2"
              >
                {isCheckingProblems ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                <div className="text-left">
                  <div className="font-semibold">Verificar Problemas</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Detecta envios parados e cria alertas automáticos
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleSyncOrders}
                disabled={isRefreshing}
                variant="outline"
                className="h-auto py-6 flex-col items-start gap-2"
              >
                {isRefreshing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ExternalLink className="h-5 w-5" />
                )}
                <div className="text-left">
                  <div className="font-semibold">Importar Histórico de Pedidos</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Sincroniza pedidos passados do Mercado Livre (até 200 pedidos)
                  </div>
                </div>
              </Button>

              <Button
                onClick={handleDiagnoseAlerts}
                disabled={isDiagnosing}
                variant="outline"
                className="h-auto py-6 flex-col items-start gap-2"
              >
                {isDiagnosing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                )}
                <div className="text-left">
                  <div className="font-semibold">Diagnosticar Inconsistências</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Identifica alertas órfãos, duplicados e envios finalizados
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Recomendação:</strong> Execute "Atualizar Status" a cada 2-4 horas e "Verificar Problemas" 1x por dia
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>

    {/* Modal de Relatório de Diagnóstico */}
    {diagnosticReport && (
      <DiagnosticReportModal
        open={!!diagnosticReport}
        onOpenChange={(open) => !open && setDiagnosticReport(null)}
        report={diagnosticReport}
      />
    )}
  </>
  );
}
