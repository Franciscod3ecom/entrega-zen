import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, Package, RefreshCw, Loader2, ExternalLink, TrendingUp, AlertTriangle, Truck, CheckCircle, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatBRT } from "@/lib/date-utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function Rastreamento() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RastreamentoItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<RastreamentoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; shipmentId: string; mlUserId: number } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadData();
  }, [navigate]);

  useEffect(() => {
    filterItems();
  }, [searchTerm, driverFilter, activeTab, items]);

  const loadData = async () => {
    setLoading(true);
    
    // Carregar rastreamento com dados adicionais para UX
    const { data: rastreamentoData, error: rastreamentoError } = await supabase
      .from("v_rastreamento_completo")
      .select(`
        *,
        shipments_cache!inner(raw_data, ml_account_id, owner_user_id)
      `)
      .order("last_ml_update", { ascending: false });

    if (rastreamentoError) {
      console.error("Erro ao carregar rastreamento:", rastreamentoError);
      toast.error("Erro ao carregar dados de rastreamento");
    } else {
      setItems(rastreamentoData || []);
    }

    // Carregar lista de motoristas para o filtro
    const { data: driversData, error: driversError } = await supabase
      .from("drivers")
      .select("id, name")
      .eq("active", true)
      .order("name");

    if (driversError) {
      console.error("Erro ao carregar motoristas:", driversError);
    } else {
      setDrivers(driversData || []);
    }

    setLoading(false);
  };

  const filterItems = () => {
    let filtered = items;

    // Filtro por aba
    switch (activeTab) {
      case "pendentes":
        filtered = filtered.filter((item) => item.assignment_id && !item.motorista_nome);
        break;
      case "em_transito":
        filtered = filtered.filter((item) => 
          ["shipped", "out_for_delivery"].includes(item.status)
        );
        break;
      case "prontos":
        filtered = filtered.filter((item) => 
          ["ready_to_ship", "handling"].includes(item.status)
        );
        break;
      case "entregues":
        filtered = filtered.filter((item) => item.status === "delivered");
        break;
      case "com_problemas":
        filtered = filtered.filter((item) => item.alertas_ativos > 0);
        break;
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.shipment_id?.toLowerCase().includes(term) ||
          item.order_id?.toLowerCase().includes(term) ||
          item.tracking_number?.toLowerCase().includes(term) ||
          item.cliente_nome?.toLowerCase().includes(term)
      );
    }

    // Filtro por motorista
    if (driverFilter !== "all") {
      filtered = filtered.filter((item) => item.motorista_nome === driverFilter);
    }

    setFilteredItems(filtered);
  };

  const handleRefresh = async (shipmentId: string) => {
    setRefreshingId(shipmentId);

    try {
      // FASE 1.1: Buscar ml_user_id antes de chamar a função
      const { data: shipmentData, error: fetchError } = await supabase
        .from('shipments_cache')
        .select('ml_account_id, ml_accounts!inner(ml_user_id)')
        .eq('shipment_id', shipmentId)
        .single();

      if (fetchError || !shipmentData) {
        throw new Error('Não foi possível buscar dados do envio');
      }

      // Chamar função com ambos os parâmetros necessários
      const { error } = await supabase.functions.invoke("refresh-shipment", {
        body: { 
          shipment_id: shipmentId,
          ml_user_id: shipmentData.ml_accounts.ml_user_id 
        },
      });

      if (error) throw error;

      await loadData();
      toast.success("Status atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar:", error);
      toast.error(error.message || "Erro ao atualizar status");
    } finally {
      setRefreshingId(null);
    }
  };

  const getUpdateBadgeColor = (lastUpdate: string) => {
    const hoursSince = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 6) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (hoursSince < 24) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  // Calcular métricas
  const metrics = {
    total: items.length,
    pendentes: items.filter((item) => item.assignment_id).length,
    comAlertas: items.filter((item) => item.alertas_ativos > 0).length,
    entreguesHoje: items.filter((item) => {
      if (item.status !== "delivered") return false;
      const hoje = new Date().toDateString();
      const updateDate = new Date(item.last_ml_update).toDateString();
      return hoje === updateDate;
    }).length,
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rastreamento</h1>
          <p className="text-muted-foreground">
            Visão unificada de todos os envios com dados enriquecidos
          </p>
        </div>

        {/* Métricas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ativo</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Motorista</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pendentes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Alertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.comAlertas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregues Hoje</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.entreguesHoje}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido, shipment, rastreio ou cliente..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por motorista" />
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

        {/* Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="em_transito">Em Trânsito</TabsTrigger>
            <TabsTrigger value="prontos">Prontos</TabsTrigger>
            <TabsTrigger value="entregues">Entregues</TabsTrigger>
            <TabsTrigger value="com_problemas">Com Problemas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="rounded-lg border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido ML</TableHead>
                    <TableHead>Shipment ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cidade/Estado</TableHead>
                    <TableHead>Rastreio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          {searchTerm || driverFilter !== "all"
                            ? "Nenhum envio encontrado com os filtros aplicados"
                            : "Nenhum envio nesta categoria"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow 
                        key={item.shipment_id}
                        className={item.alertas_ativos > 0 ? "bg-red-500/5" : ""}
                      >
                        <TableCell className="font-mono font-medium">
                          {item.order_id ? (
                            <a
                              href={`https://www.mercadolivre.com.br/vendas/${item.order_id}/detalhe`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              #{item.order_id}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.shipment_id}
                        </TableCell>
                         <TableCell className="max-w-[150px] truncate">
                          {item.cliente_nome}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.cidade && item.estado 
                            ? `${item.cidade}/${item.estado}`
                            : item.cidade || item.estado || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.tracking_number || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={item.status}
                              substatus={item.substatus}
                            />
                            {item.alertas_ativos > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {item.alertas_ativos} alerta{item.alertas_ativos > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.motorista_nome ? (
                            <div className="text-sm">
                              <div className="font-medium">{item.motorista_nome}</div>
                              {item.motorista_phone && (
                                <div className="text-xs text-muted-foreground">
                                  {item.motorista_phone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={getUpdateBadgeColor(item.last_ml_update)}
                            >
                              {formatDistanceToNow(new Date(item.last_ml_update), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {formatBRT(item.last_ml_update)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefresh(item.shipment_id)}
                              disabled={refreshingId === item.shipment_id}
                              title="Atualizar status agora"
                            >
                              {refreshingId === item.shipment_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              <span className="ml-1 hidden sm:inline">Atualizar</span>
                            </Button>
                            
                            {item.ml_account_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  // Buscar ml_user_id da conta
                                  const { data: mlAccount } = await supabase
                                    .from('ml_accounts')
                                    .select('ml_user_id')
                                    .eq('id', item.ml_account_id)
                                    .single();
                                  
                                  if (mlAccount) {
                                    setHistoryModal({
                                      isOpen: true,
                                      shipmentId: item.shipment_id,
                                      mlUserId: mlAccount.ml_user_id,
                                    });
                                  }
                                }}
                                title="Ver histórico do envio"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Histórico */}
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
