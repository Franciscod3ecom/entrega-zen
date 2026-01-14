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
import { Search, Package, RefreshCw, Loader2, TrendingUp, AlertTriangle, Truck, CheckCircle, History, Clock, CheckCircle2, PackageCheck, Wifi, Filter, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatBRT } from "@/lib/date-utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  
  const [shipments, setShipments] = useState<RastreamentoItem[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<RastreamentoItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertItem[]>([]);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [driverFilter, setDriverFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [alertTypeFilter, setAlertTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [mlAccounts, setMlAccounts] = useState<Array<{ id: string; nickname: string; ml_user_id: number }>>([]);
  const [activeView, setActiveView] = useState<"rastreamento" | "alertas">("rastreamento");

  // Cores para badges de contas ML
  const accountColors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  ];

  const getAccountColor = (accountId: string | null) => {
    if (!accountId) return "bg-muted text-muted-foreground";
    const index = mlAccounts.findIndex(a => a.id === accountId);
    return index >= 0 ? accountColors[index % accountColors.length] : "bg-muted text-muted-foreground";
  };

  const getAccountShortName = (accountId: string | null) => {
    if (!accountId) return "—";
    const account = mlAccounts.find(a => a.id === accountId);
    if (!account) return "—";
    return account.nickname.replace(/DISTRIBUIDORA|DISTRIBUIDOR|\.CLUB/gi, '').trim().slice(0, 4).toUpperCase();
  };

  const getMlUserId = (accountId: string | null): number => {
    if (!accountId) return 0;
    const account = mlAccounts.find(a => a.id === accountId);
    return account?.ml_user_id || 0;
  };
  
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; shipmentId: string; mlUserId: number } | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchTerm(search);
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
          if (payload.new && typeof payload.new === 'object' && 'shipment_id' in payload.new) {
            const shipmentId = (payload.new as any).shipment_id;
            setNewItemIds((prev) => new Set(prev).add(shipmentId));
            setTimeout(() => {
              setNewItemIds((prev) => {
                const next = new Set(prev);
                next.delete(shipmentId);
                return next;
              });
            }, 5000);
          }
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
    await Promise.all([loadShipments(), loadAlerts(), loadDrivers(), loadMlAccounts()]);
    setLoading(false);
  };

  const loadMlAccounts = async () => {
    const { data } = await supabase
      .from("ml_accounts")
      .select("id, nickname, ml_user_id")
      .order("nickname");
    if (data) {
      setMlAccounts(data);
    }
  };

  const loadShipments = async () => {
    const { data, error } = await supabase
      .from("v_rastreamento_completo")
      .select("*")
      .order("last_ml_update", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar dados");
    } else {
      setShipments(data || []);
    }
  };

  const loadAlerts = async () => {
    const { data: alertsData, error } = await supabase
      .from("shipment_alerts")
      .select(`*, drivers(name, phone)`)
      .order("detected_at", { ascending: false });

    if (error) {
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
    const { data } = await supabase
      .from("drivers")
      .select("id, name")
      .eq("active", true)
      .order("name");
    setDrivers(data || []);
  };

  const applyFilters = () => {
    let filteredShips = shipments;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filteredShips = filteredShips.filter(item =>
        item.shipment_id?.toLowerCase().includes(search) ||
        item.order_id?.toLowerCase().includes(search) ||
        item.pack_id?.toLowerCase().includes(search) ||
        item.tracking_number?.toLowerCase().includes(search) ||
        item.cliente_nome?.toLowerCase().includes(search) ||
        item.cidade?.toLowerCase().includes(search) ||
        item.motorista_nome?.toLowerCase().includes(search)
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

    if (accountFilter !== "all") {
      filteredShips = filteredShips.filter(item => item.ml_account_id === accountFilter);
    }

    setFilteredShipments(filteredShips);

    let filteredAlts = alerts;

    if (searchTerm) {
      filteredAlts = filteredAlts.filter(alert =>
        alert.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.shipments_cache?.order_id?.toLowerCase().includes(searchTerm.toLowerCase())
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
      const { error } = await supabase.functions.invoke("refresh-shipment", {
        body: { shipment_id: shipmentId, ml_user_id: mlUserId },
      });
      if (error) throw error;
      toast.success("Status atualizado!");
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      const { error } = await supabase
        .from("shipment_alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
      toast.success("Alerta resolvido!");
      await loadAlerts();
    } catch {
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
      toast.success("Marcado como devolvido!");
      await loadAllData();
    } catch {
      toast.error("Erro ao marcar devolução");
    } finally {
      setReturningId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-all-accounts", {
        body: { hours_back: 48 },
      });
      if (error) throw error;
      
      const results = data?.results || [];
      const totalShipments = results.reduce((acc: number, r: any) => acc + (r.shipments_processed || 0), 0);
      
      toast.success(`Sincronização concluída! ${totalShipments} envios atualizados de ${results.length} contas`);
      await loadAllData();
    } catch (error: any) {
      console.error("Erro ao sincronizar:", error);
      toast.error(error.message || "Erro ao sincronizar contas");
    } finally {
      setSyncingAll(false);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      not_scanned: "Não Bipado",
      missing_shipment: "Ausente",
      duplicate_scan: "Duplicado",
      stale_status: "Parado",
      no_driver: "Sem Motorista",
      not_delivered_awaiting_return: "Não Entregue",
    };
    return labels[type] || type;
  };

  const getClientName = (rawData: any) => {
    if (!rawData) return "N/A";
    return rawData.receiver?.first_name || rawData.buyer?.nickname || "Cliente";
  };

  const metrics = {
    totalEnvios: shipments.length,
    totalAtivos: shipments.filter(s => !["delivered", "not_delivered", "cancelled"].includes(s.status)).length,
    emRota: shipments.filter(s => ["shipped", "out_for_delivery"].includes(s.status)).length,
    pendentes: shipments.filter(s => s.status === "ready_to_ship").length,
    entreguesTotal: shipments.filter(s => s.status === "delivered").length,
    entreguesHoje: shipments.filter(s => {
      const today = new Date().toDateString();
      return s.status === "delivered" && new Date(s.last_ml_update).toDateString() === today;
    }).length,
    naoEntregues: shipments.filter(s => s.status === "not_delivered").length,
    comAlertas: shipments.filter(s => s.alertas_ativos > 0).length,
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
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">Operações</h1>
            <p className="text-sm text-muted-foreground">
              Rastreamento e alertas em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "rounded-lg py-1.5",
                realtimeConnected ? "border-success/50 text-success" : "text-muted-foreground"
              )}
            >
              <Wifi className="h-3 w-3 mr-1.5" />
              {realtimeConnected ? "Realtime" : "Conectando"}
            </Badge>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSyncAll} 
              disabled={syncingAll}
              className="rounded-lg h-9 bg-primary hover:bg-primary/90"
            >
              {syncingAll ? (
                <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">{syncingAll ? "Sincronizando..." : "Sincronizar ML"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={loadAllData} className="rounded-lg h-9">
              <RefreshCw className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Metrics - Mobile cards */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6 md:gap-3">
          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="text-xl font-bold">{metrics.totalEnvios}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Em Rota</span>
              </div>
              <div className="text-xl font-bold text-primary">{metrics.emRota}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <PackageCheck className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Entregues</span>
              </div>
              <div className="text-xl font-bold text-success">{metrics.entreguesTotal}</div>
              {metrics.entreguesHoje > 0 && (
                <span className="text-[10px] text-muted-foreground">+{metrics.entreguesHoje} hoje</span>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <span className="text-xs text-muted-foreground">Não Entregues</span>
              </div>
              <div className="text-xl font-bold text-danger">{metrics.naoEntregues}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-xl hidden md:block">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Prontos</span>
              </div>
              <div className="text-xl font-bold text-warning">{metrics.pendentes}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-xl hidden md:block">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <span className="text-xs text-muted-foreground">Alertas</span>
              </div>
              <div className="text-xl font-bold text-danger">{metrics.alertasPendentes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Mobile sheet */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido, cliente, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl md:hidden">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Motorista</label>
                  <Select value={driverFilter} onValueChange={setDriverFilter}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
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
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="ready_to_ship">Pronto</SelectItem>
                      <SelectItem value="shipped">Em Trânsito</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="not_delivered">Não Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Conta ML</label>
                  <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {mlAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.nickname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setDriverFilter("all");
                    setStatusFilter("all");
                    setAlertTypeFilter("all");
                    setAccountFilter("all");
                  }}
                  className="w-full h-11 rounded-xl"
                >
                  Limpar Filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop filters */}
          <div className="hidden md:flex items-center gap-2">
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-40 h-11 rounded-xl">
                <SelectValue placeholder="Motorista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.name}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-11 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="ready_to_ship">Pronto</SelectItem>
                <SelectItem value="shipped">Em Trânsito</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="not_delivered">Não Entregue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-44 h-11 rounded-xl">
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Contas</SelectItem>
                {mlAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "rastreamento" | "alertas")}>
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl p-1">
            <TabsTrigger value="rastreamento" className="rounded-lg gap-2 h-10">
              <Package className="h-4 w-4" />
              <span>Rastreamento</span>
              <Badge variant="secondary" className="ml-1">{filteredShipments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="alertas" className="rounded-lg gap-2 h-10">
              <AlertTriangle className="h-4 w-4" />
              <span>Alertas</span>
              <Badge variant="secondary" className="ml-1">{filteredAlerts.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Shipments Tab */}
          <TabsContent value="rastreamento" className="mt-4">
            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
              {filteredShipments.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum envio encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                filteredShipments.slice(0, 50).map((item) => (
                  <Card 
                    key={item.shipment_id} 
                    className={cn(
                      "border-0 shadow-sm rounded-xl overflow-hidden touch-feedback",
                      newItemIds.has(item.shipment_id) && "ring-2 ring-primary/50"
                    )}
                    onClick={() => setHistoryModal({ isOpen: true, shipmentId: item.shipment_id, mlUserId: getMlUserId(item.ml_account_id) })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          {/* Tag da conta ML */}
                          <Badge className={cn("text-[10px] px-1.5 py-0 h-4 mb-1 font-medium", getAccountColor(item.ml_account_id))}>
                            {getAccountShortName(item.ml_account_id)}
                          </Badge>
                          {/* Mostrar Order/Pack ID de forma visível */}
                          {(item.order_id || item.pack_id) && (
                            <p className="text-xs text-primary font-medium mb-0.5">
                              {item.pack_id ? `Pacote: ${item.pack_id}` : `Pedido: ${item.order_id}`}
                            </p>
                          )}
                          <p className="font-medium truncate">{item.cliente_nome || 'Cliente não identificado'}</p>
                          <p className="font-mono text-xs text-muted-foreground">{item.shipment_id}</p>
                        </div>
                        <StatusBadge status={item.status} substatus={item.substatus} />
                      </div>
                      {/* Localização */}
                      {item.cidade && (
                        <p className="text-xs text-muted-foreground mb-2">
                          📍 {item.cidade}{item.estado ? `, ${item.estado}` : ''}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          {item.motorista_nome && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {item.motorista_nome}
                            </span>
                          )}
                          {item.alertas_ativos > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                              {item.alertas_ativos} alerta{item.alertas_ativos > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block border-0 shadow-sm rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Atualização</TableHead>
                    <TableHead>Alertas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                        Nenhum envio encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments.map((item) => (
                      <TableRow 
                        key={item.shipment_id}
                        className={newItemIds.has(item.shipment_id) ? "animate-pulse bg-primary/5" : ""}
                      >
                        <TableCell className="font-mono text-sm">{item.shipment_id}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs font-medium", getAccountColor(item.ml_account_id))}>
                            {getAccountShortName(item.ml_account_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {item.pack_id && <div className="text-sm font-medium">Pacote: {item.pack_id}</div>}
                            {item.order_id && !item.pack_id && <div className="text-sm font-medium">Pedido: {item.order_id}</div>}
                            {item.order_id && item.pack_id && <div className="text-xs text-muted-foreground">Pedido: {item.order_id}</div>}
                            {!item.order_id && !item.pack_id && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.cliente_nome || 'Não identificado'}</div>
                            {item.cidade && (
                              <div className="text-xs text-muted-foreground">{item.cidade}{item.estado ? ` - ${item.estado}` : ''}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} substatus={item.substatus} />
                        </TableCell>
                        <TableCell>
                          {item.motorista_nome ? (
                            <div>
                              <div className="text-sm font-medium">{item.motorista_nome}</div>
                              <div className="text-xs text-muted-foreground">{item.motorista_phone}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(item.last_ml_update), { addSuffix: true, locale: ptBR })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{formatBRT(item.last_ml_update)}</TooltipContent>
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
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHistoryModal({ isOpen: true, shipmentId: item.shipment_id, mlUserId: getMlUserId(item.ml_account_id) })}
                              className="h-8 w-8 p-0"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRefresh(item.shipment_id, getMlUserId(item.ml_account_id))}
                              disabled={refreshingId === item.shipment_id}
                              className="h-8 w-8 p-0"
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
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alertas" className="mt-4">
            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
              {filteredAlerts.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum alerta encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                filteredAlerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={cn(
                      "border-0 shadow-sm rounded-xl overflow-hidden",
                      newItemIds.has(alert.id) && "ring-2 ring-primary/50"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-semibold truncate">{alert.shipment_id}</p>
                          <p className="text-sm text-muted-foreground">{getClientName(alert.shipments_cache?.raw_data)}</p>
                        </div>
                        <Badge variant={alert.status === "pending" ? "destructive" : "secondary"}>
                          {getAlertTypeLabel(alert.alert_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {alert.drivers?.name && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {alert.drivers.name}
                            </span>
                          )}
                        </div>
                        {alert.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveAlert(alert.id)}
                            disabled={resolvingId === alert.id}
                            className="h-8 rounded-lg"
                          >
                            {resolvingId === alert.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolver
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <Card className="hidden md:block border-0 shadow-sm rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detectado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        Nenhum alerta encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <TableRow 
                        key={alert.id}
                        className={newItemIds.has(alert.id) ? "animate-pulse bg-primary/5" : ""}
                      >
                        <TableCell className="font-mono text-sm">{alert.shipment_id}</TableCell>
                        <TableCell>{getClientName(alert.shipments_cache?.raw_data)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getAlertTypeLabel(alert.alert_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          {alert.drivers ? (
                            <div>
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
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true, locale: ptBR })}
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkReturned(alert.shipment_id)}
                                disabled={returningId === alert.shipment_id}
                                className="h-8"
                              >
                                {returningId === alert.shipment_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>Devolvido</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleResolveAlert(alert.id)}
                                disabled={resolvingId === alert.id}
                                className="h-8"
                              >
                                {resolvingId === alert.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Resolver
                                  </>
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* History Modal */}
      {historyModal?.isOpen && (
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
