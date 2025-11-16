import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Clock, Package, Filter, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
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
  shipments_cache: {
    order_id: string | null;
    tracking_number: string | null;
    raw_data: any;
  } | null;
}

const Alertas = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
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
      
      // Buscar alertas com drivers
      const { data: alertsData, error } = await supabase
        .from("shipment_alerts")
        .select(`
          *,
          drivers(name, phone, carriers(name))
        `)
        .order("detected_at", { ascending: false });

      if (error) throw error;
      
      // Buscar shipments_cache para os shipment_ids dos alertas
      if (alertsData && alertsData.length > 0) {
        const shipmentIds = alertsData.map(a => a.shipment_id);
        const { data: shipmentsData } = await supabase
          .from("shipments_cache")
          .select("shipment_id, order_id, tracking_number, raw_data")
          .in("shipment_id", shipmentIds);

        // Fazer merge dos dados
        const enrichedAlerts = alertsData.map(alert => ({
          ...alert,
          shipments_cache: shipmentsData?.find(s => s.shipment_id === alert.shipment_id) || null,
        }));

        setAlerts(enrichedAlerts);
      } else {
        setAlerts([]);
      }
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

  const handleMarkReturned = async (shipmentId: string) => {
    try {
      setReturningId(shipmentId);
      
      // Buscar o assignment ativo para este shipment
      const { data: assignment, error: fetchError } = await supabase
        .from('driver_assignments')
        .select('id')
        .eq('shipment_id', shipmentId)
        .is('returned_at', null)
        .single();

      if (fetchError) throw fetchError;
      if (!assignment) throw new Error('Assignment não encontrado');

      const { error } = await supabase
        .from('driver_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('id', assignment.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Envio marcado como devolvido ao estoque!",
      });

      loadAlerts();
    } catch (error: any) {
      console.error("Erro ao marcar devolução:", error);
      toast({
        title: "Erro ao marcar devolução",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReturningId(null);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      not_delivered_awaiting_return: "Não entregue - Aguardando devolução",
      not_delivered_not_returned: "Não entregue e não devolvido (>48h)",
      missing_driver_info: "Informação de motorista ausente",
      stuck_shipment: "Envio parado há mais de 48h",
      ready_not_shipped: "Pronto mas não expedido há mais de 24h",
      not_returned: "Com motorista há mais de 72h sem devolução",
    };
    return labels[type] || type;
  };

  const getClientName = (rawData: any) => {
    try {
      if (!rawData) return '-';
      const receiver = rawData.receiver_address || rawData.shipping_option?.receiver_address;
      return receiver?.receiver_name || '-';
    } catch {
      return '-';
    }
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

  const pendingCount = alerts.filter(a => a.status === "pending" && (typeFilter === "all" || a.alert_type === typeFilter)).length;
  const investigatingCount = alerts.filter(a => a.status === "investigating" && (typeFilter === "all" || a.alert_type === typeFilter)).length;
  const resolvedCount = alerts.filter(a => a.status === "resolved" && (typeFilter === "all" || a.alert_type === typeFilter)).length;

  // Filtrar alertas por tipo
  const filteredAlerts = typeFilter === "all" 
    ? alerts 
    : alerts.filter(a => a.alert_type === typeFilter);

  // Função para determinar se o alerta é crítico (48h+)
  const isCriticalAlert = (detectedAt: string) => {
    const hours = (Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60);
    return hours >= 48;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alertas de Envios</h1>
          <p className="text-muted-foreground mt-2">
            Monitoramento de pacotes não entregues e não devolvidos
          </p>
        </div>

        <div className="space-y-4">
          {/* Filtro por tipo de alerta */}
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Filtrar por tipo de alerta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="stuck_shipment">Envio parado 48h+</SelectItem>
                <SelectItem value="ready_not_shipped">Pronto não expedido 24h+</SelectItem>
                <SelectItem value="not_returned">Com motorista 72h+ sem devolução</SelectItem>
                <SelectItem value="not_delivered_awaiting_return">Não entregue - Aguardando devolução</SelectItem>
                <SelectItem value="not_delivered_not_returned">Não entregue e não devolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-secondary" />
                <p>Nenhum alerta {typeFilter !== "all" ? "deste tipo" : "no momento"}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Pedido ML</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Rastreio</TableHead>
                      <TableHead>Tipo de Alerta</TableHead>
                      <TableHead>Motorista/Transportadora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detectado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => {
                      const isCritical = isCriticalAlert(alert.detected_at);
                      const clientName = getClientName(alert.shipments_cache?.raw_data);
                      
                      return (
                        <TableRow key={alert.id} className={isCritical ? "bg-red-500/5" : ""}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              {alert.shipment_id}
                              {isCritical && (
                                <Badge variant="destructive" className="text-xs">Crítico</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {alert.shipments_cache?.order_id ? (
                              <a
                                href={`https://www.mercadolivre.com.br/vendas/${alert.shipments_cache.order_id}/detalhe`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                                title="Abrir pedido no Mercado Livre"
                              >
                                #{alert.shipments_cache.order_id}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={clientName}>
                            {clientName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {alert.shipments_cache?.tracking_number || "N/A"}
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    {formatDistanceToNow(new Date(alert.detected_at), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono text-xs">
                                    {format(new Date(alert.detected_at), "dd/MM/yyyy HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {alert.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkReturned(alert.shipment_id)}
                                    disabled={returningId === alert.shipment_id}
                                  >
                                    {returningId === alert.shipment_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Devolvido"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleResolve(alert.id)}
                                    disabled={resolvingId === alert.id}
                                  >
                                    {resolvingId === alert.id ? "Resolvendo..." : "Resolver"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
