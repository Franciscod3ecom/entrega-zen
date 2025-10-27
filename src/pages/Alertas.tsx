import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Clock, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Alert {
  id: string;
  shipment_id: string;
  alert_type: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  notes: string | null;
  drivers: {
    name: string;
    phone: string;
    carriers: {
      name: string;
    } | null;
  } | null;
}

const Alertas = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadAlerts();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shipment_alerts")
        .select(`
          *,
          drivers(name, phone, carriers(name))
        `)
        .order("detected_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar alertas:", error);
      toast({
        title: "Erro ao carregar alertas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      setResolvingId(alertId);
      const { error } = await supabase
        .from("shipment_alerts")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido com sucesso.",
      });

      loadAlerts();
    } catch (error: any) {
      console.error("Erro ao resolver alerta:", error);
      toast({
        title: "Erro ao resolver alerta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResolvingId(null);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      not_delivered_awaiting_return: "Não entregue - Aguardando devolução",
      not_delivered_not_returned: "Não entregue e não devolvido (>48h)",
      missing_driver_info: "Informação de motorista ausente",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "destructive" as const, icon: AlertTriangle, label: "Pendente" },
      investigating: { variant: "default" as const, icon: Clock, label: "Investigando" },
      resolved: { variant: "secondary" as const, icon: CheckCircle2, label: "Resolvido" },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const pendingCount = alerts.filter(a => a.status === "pending").length;
  const investigatingCount = alerts.filter(a => a.status === "investigating").length;
  const resolvedCount = alerts.filter(a => a.status === "resolved").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alertas de Envios</h1>
          <p className="text-muted-foreground mt-2">
            Monitoramento de pacotes não entregues e não devolvidos
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Requerem atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Investigação</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{investigatingCount}</div>
              <p className="text-xs text-muted-foreground">Sendo analisados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolvedCount}</div>
              <p className="text-xs text-muted-foreground">Total resolvido</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lista de Alertas
            </CardTitle>
            <CardDescription>
              Pacotes com problemas de entrega ou devolução
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-secondary" />
                <p>Nenhum alerta no momento</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Tipo de Alerta</TableHead>
                      <TableHead>Motorista/Transportadora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detectado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-mono text-sm">
                          {alert.shipment_id}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getAlertTypeLabel(alert.alert_type)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {alert.drivers?.name || "N/A"}
                            </div>
                            {alert.drivers?.carriers?.name && (
                              <div className="text-xs text-muted-foreground">
                                {alert.drivers.carriers.name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(alert.status)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(alert.detected_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {alert.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleResolve(alert.id)}
                              disabled={resolvingId === alert.id}
                            >
                              {resolvingId === alert.id
                                ? "Resolvendo..."
                                : "Marcar como Resolvido"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Alertas;
