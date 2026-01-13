import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import ShipmentHistoryModal from "@/components/ShipmentHistoryModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Package, RefreshCw, Loader2, ExternalLink, TrendingUp, AlertTriangle, Truck, CheckCircle, History, Filter, Clock, CheckCircle2, PackageCheck, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatBRT } from "@/lib/date-utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RastreamentoItem {
  shipment_id: string;
  order_id: string | null;
  pack_id: string | null;
  tracking_number: string | null;
  status: string;
  substatus: string | null;
  last_ml_update: string;
  cliente_nome: string;
  cidade: string | null;
  estado: string | null;
  motorista_nome: string | null;
  motorista_phone: string | null;
  alertas_ativos: number;
  assignment_id: string | null;
  ml_account_id: string | null;
  owner_user_id: string | null;
}

interface AlertItem {
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
  } | null;
  shipments_cache: {
    order_id: string | null;
    tracking_number: string | null;
    raw_data: any;
  } | null;
}

export default function OperacoesUnificadas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estados de rastreamento
  const [shipments, setShipments] = useState<RastreamentoItem[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<RastreamentoItem[]>([]);
  
  // Estados de alertas
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertItem[]>([]);
  
  // Estados compartilhados
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [driverFilter, setDriverFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [alertTypeFilter, setAlertTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [activeView, setActiveView] = useState<"rastreamento" | "alertas">("rastreamento");
  
  // Estados de ações
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; shipmentId: string; mlUserId: number } | null>(null);

  // Estado de realtime
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Sync search param to search term
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchTerm(search);
      // Clear the search param after reading
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setupRealtimeSubscription(session.user.id);
      }
    });
    loadAllData();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [navigate]);

  const setupRealtimeSubscription = useCallback((userId: string) => {
    const channel = supabase
      .channel("operacoes-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipments_cache",
          filter: `owner_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Realtime shipment update:", payload);
          // Mark the item as new for highlighting
          if (payload.new && typeof payload.new === 'object' && 'shipment_id' in payload.new) {
            const shipmentId = (payload.new as any).shipment_id;
            setNewItemIds((prev) => new Set(prev).add(shipmentId));
            // Remove highlight after 5 seconds
            setTimeout(() => {
              setNewItemIds((prev) => {
                const next = new Set(prev);
                next.delete(shipmentId);
                return next;
              });
            }, 5000);
          }
          // Reload data
          loadShipments();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipment_alerts",
          filter: `owner_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Realtime alert update:", payload);
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const alertId = (payload.new as any).id;
            setNewItemIds((prev) => new Set(prev).add(alertId));
            setTimeout(() => {
              setNewItemIds((prev) => {
                const next = new Set(prev);
                next.delete(alertId);
                return next;
              });
            }, 5000);
          }
          loadAlerts();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, driverFilter, statusFilter, alertTypeFilter, shipments, alerts, activeView]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadShipments(), loadAlerts(), loadDrivers()]);
    setLoading(false);
  };

  const loadShipments = async () => {
    const { data, error } = await supabase
      .from("v_rastreamento_completo")
      .select("*")
      .order("last_ml_update", { ascending: false });

    if (error) {
      console.error("Erro ao carregar rastreamento:", error);
      toast.error("Erro ao carregar dados de rastreamento");
    } else {
      setShipments(data || []);
    }
  };

  const loadAlerts = async () => {
    const { data: alertsData, error } = await supabase
      .from("shipment_alerts")
      .select(`
        *,
        drivers(name, phone)
      `)
      .order("detected_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar alertas:", error);
      toast.error("Erro ao carregar alertas");
      return;
    }

    if (alertsData && alertsData.length > 0) {
      const shipmentIds = alertsData.map(a => a.shipment_id);
      const { data: shipmentsData } = await supabase
        .from("shipments_cache")
        .select("shipment_id, order_id, tracking_number, raw_data")
        .in("shipment_id", shipmentIds);

      const enrichedAlerts = alertsData.map(alert => ({
        ...alert,
        shipments_cache: shipmentsData?.find(s => s.shipment_id === alert.shipment_id) || null,
      }));

      setAlerts(enrichedAlerts);
    }
  };

  const loadDrivers = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, name")
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("Erro ao carregar motoristas:", error);
    } else {
      setDrivers(data || []);
    }
  };

  const applyFilters = () => {
    // Filtrar rastreamento
    let filteredShips = shipments;

    if (searchTerm) {
      filteredShips = filteredShips.filter(item =>
        item.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (driverFilter !== "all") {
      filteredShips = filteredShips.filter(item =>
        item.motorista_nome?.includes(driverFilter)
      );
    }

    if (statusFilter !== "all") {
      filteredShips = filteredShips.filter(item => item.status === statusFilter);
    }

    setFilteredShipments(filteredShips);

    // Filtrar alertas
    let filteredAlts = alerts;

    if (searchTerm) {
      filteredAlts = filteredAlts.filter(alert =>
        alert.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.shipments_cache?.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.shipments_cache?.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (driverFilter !== "all") {
      filteredAlts = filteredAlts.filter(alert =>
        alert.drivers?.name.includes(driverFilter)
      );
    }

    if (alertTypeFilter !== "all") {
      filteredAlts = filteredAlts.filter(alert => alert.alert_type === alertTypeFilter);
    }

    if (statusFilter !== "all") {
      filteredAlts = filteredAlts.filter(alert => alert.status === statusFilter);
    }

    setFilteredAlerts(filteredAlts);
  };

  const handleRefresh = async (shipmentId: string, mlUserId: number) => {
    setRefreshingId(shipmentId);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-shipment", {
        body: { shipment_id: shipmentId, ml_user_id: mlUserId },
      });

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      await loadAllData();
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
      toast.error(error.message || "Erro ao atualizar status");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      const { error } = await supabase
        .from("shipment_alerts")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      toast.success("Alerta resolvido com sucesso!");
      await loadAlerts();
    } catch (error: any) {
      console.error("Erro ao resolver alerta:", error);
      toast.error("Erro ao resolver alerta");
    } finally {
      setResolvingId(null);
    }
  };

  const handleMarkReturned = async (shipmentId: string) => {
    setReturningId(shipmentId);
    try {
      const { error } = await supabase
        .from("driver_assignments")
        .update({ returned_at: new Date().toISOString() })
        .eq("shipment_id", shipmentId)
        .is("returned_at", null);

      if (error) throw error;

      toast.success("Pacote marcado como devolvido!");
      await loadAllData();
    } catch (error: any) {
      console.error("Erro ao marcar devolução:", error);
      toast.error("Erro ao marcar devolução");
    } finally {
      setReturningId(null);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      not_scanned: "Não Bipado",
      missing_shipment: "Envio Ausente",
      duplicate_scan: "Bipagem Duplicada",
      stale_status: "Status Parado",
      no_driver: "Sem Motorista",
    };
    return labels[type] || type;
  };

  const getClientName = (rawData: any) => {
    if (!rawData) return "N/A";
    return rawData.receiver?.first_name || rawData.buyer?.nickname || "Cliente";
  };

  const getUpdateBadgeColor = (lastUpdate: string) => {
    const hoursAgo = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 3) return "success";
    if (hoursAgo < 24) return "default";
    return "destructive";
  };

  // Métricas
  const metrics = {
    totalAtivos: shipments.filter(s => !["delivered", "not_delivered", "cancelled"].includes(s.status)).length,
    pendentes: shipments.filter(s => s.status === "ready_to_ship").length,
    comAlertas: shipments.filter(s => s.alertas_ativos > 0).length,
    entreguesHoje: shipments.filter(s => {
      const today = new Date().toDateString();
      return s.status === "delivered" && new Date(s.last_ml_update).toDateString() === today;
    }).length,
    alertasPendentes: alerts.filter(a => a.status === "pending").length,
    alertasResolvidos: alerts.filter(a => a.status === "resolved").length,
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Operações Unificadas</h1>
            <p className="text-muted-foreground">
              Visão consolidada de rastreamento e alertas em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              realtimeConnected 
                ? "bg-success/10 text-success" 
                : "bg-muted text-muted-foreground"
            }`}>
              <Wifi className="h-3 w-3" />
              {realtimeConnected ? "Realtime Ativo" : "Conectando..."}
            </div>
            <Button variant="outline" size="sm" onClick={loadAllData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Métricas Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAtivos}</div>
              <p className="text-xs text-muted-foreground">envios em trânsito</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pendentes}</div>
              <p className="text-xs text-muted-foreground">aguardando expedição</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Alertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics.comAlertas}</div>
              <p className="text-xs text-muted-foreground">requerem atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregues Hoje</CardTitle>
              <PackageCheck className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{metrics.entreguesHoje}</div>
              <p className="text-xs text-muted-foreground">finalizados hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{metrics.alertasPendentes}</div>
              <p className="text-xs text-muted-foreground">não resolvidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Resolvidos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{metrics.alertasResolvidos}</div>
              <p className="text-xs text-muted-foreground">concluídos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Avançados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </CardTitle>
            <CardDescription>
              Refine a visualização aplicando múltiplos filtros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ID, rastreio, cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motorista</label>
                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os motoristas</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.name}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="ready_to_ship">Pronto</SelectItem>
                    <SelectItem value="shipped">Em Trânsito</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="not_delivered">Não Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeView === "alertas" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Alerta</label>
                  <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="not_scanned">Não Bipado</SelectItem>
                      <SelectItem value="missing_shipment">Envio Ausente</SelectItem>
                      <SelectItem value="duplicate_scan">Bipagem Duplicada</SelectItem>
                      <SelectItem value="stale_status">Status Parado</SelectItem>
                      <SelectItem value="no_driver">Sem Motorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setDriverFilter("all");
                    setStatusFilter("all");
                    setAlertTypeFilter("all");
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Visualização */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "rastreamento" | "alertas")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rastreamento" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Rastreamento ({filteredShipments.length})
            </TabsTrigger>
            <TabsTrigger value="alertas" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas ({filteredAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rastreamento" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Envios em Rastreamento</CardTitle>
                <CardDescription>
                  Visualização completa de todos os envios com status e motoristas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Order/Pack</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Última Atualização</TableHead>
                      <TableHead>Alertas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhum envio encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredShipments.map((item) => (
                        <TableRow 
                          key={item.shipment_id}
                          className={newItemIds.has(item.shipment_id) ? "animate-pulse bg-primary/10" : ""}
                        >
                          <TableCell className="font-mono text-sm">
                            {item.shipment_id}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {item.order_id && (
                                <div className="text-sm">Order: {item.order_id}</div>
                              )}
                              {item.pack_id && (
                                <div className="text-xs text-muted-foreground">Pack: {item.pack_id}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{item.cliente_nome}</div>
                              {item.cidade && (
                                <div className="text-xs text-muted-foreground">
                                  {item.cidade} - {item.estado}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} substatus={item.substatus} />
                          </TableCell>
                          <TableCell>
                            {item.motorista_nome ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{item.motorista_nome}</div>
                                <div className="text-xs text-muted-foreground">{item.motorista_phone}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sem motorista</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant={getUpdateBadgeColor(item.last_ml_update) as any}>
                                    {formatDistanceToNow(new Date(item.last_ml_update), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {formatBRT(item.last_ml_update)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            {item.alertas_ativos > 0 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {item.alertas_ativos}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setHistoryModal({
                                    isOpen: true,
                                    shipmentId: item.shipment_id,
                                    mlUserId: 0,
                                  })
                                }
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRefresh(item.shipment_id, 0)}
                                disabled={refreshingId === item.shipment_id}
                              >
                                {refreshingId === item.shipment_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alertas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alertas Ativos</CardTitle>
                <CardDescription>
                  Monitoramento e gestão de alertas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Rastreio</TableHead>
                      <TableHead>Tipo de Alerta</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detectado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Nenhum alerta encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlerts.map((alert) => (
                        <TableRow 
                          key={alert.id}
                          className={newItemIds.has(alert.id) ? "animate-pulse bg-primary/10" : ""}
                        >
                          <TableCell className="font-mono text-sm">
                            {alert.shipment_id}
                          </TableCell>
                          <TableCell>
                            {alert.shipments_cache?.order_id || "—"}
                          </TableCell>
                          <TableCell>
                            {getClientName(alert.shipments_cache?.raw_data)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {alert.shipments_cache?.tracking_number || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getAlertTypeLabel(alert.alert_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {alert.drivers ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{alert.drivers.name}</div>
                                <div className="text-xs text-muted-foreground">{alert.drivers.phone}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {alert.status === "pending" ? (
                              <Badge variant="destructive" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pendente
                              </Badge>
                            ) : alert.status === "investigating" ? (
                              <Badge variant="default" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Investigando
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Resolvido
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm">
                                    {formatDistanceToNow(new Date(alert.detected_at), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {format(new Date(alert.detected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-right">
                            {alert.status === "pending" && (
                              <div className="flex items-center justify-end gap-2">
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
                                  variant="default"
                                  onClick={() => handleResolveAlert(alert.id)}
                                  disabled={resolvingId === alert.id}
                                >
                                  {resolvingId === alert.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Resolver"
                                  )}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {historyModal && (
        <ShipmentHistoryModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal(null)}
          shipmentId={historyModal.shipmentId}
          mlUserId={historyModal.mlUserId}
        />
      )}
    </Layout>
  );
}
