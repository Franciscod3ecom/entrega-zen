import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
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
import { Search, Package, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatBRT } from "@/lib/date-utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Shipment {
  shipment_id: number;
  order_id: number | null;
  status: string;
  substatus: string | null;
  tracking_number: string | null;
  last_update: string;
}

export default function Envios() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadShipments();
  }, [navigate]);

  useEffect(() => {
    filterShipments();
  }, [searchTerm, statusFilter, shipments]);

  const loadShipments = async () => {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("last_update", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar envios");
    } else {
      setShipments(data || []);
    }
  };

  const filterShipments = () => {
    let filtered = shipments;

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.shipment_id.toString().includes(searchTerm) ||
          s.tracking_number?.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredShipments(filtered);
  };

  const handleRefresh = async (shipmentId: number) => {
    setRefreshingId(shipmentId);

    try {
      const { error } = await supabase.functions.invoke('refresh-shipment', {
        body: { shipment_id: String(shipmentId) },
      });

      if (error) throw error;

      // Recarregar dados
      await loadShipments();

      toast.success("Status atualizado com sucesso!");
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast.error(error.message || "Erro ao atualizar status");
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Envios</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe todos os envios
          </p>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou código de rastreio..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="not_delivered">Não Entregue</SelectItem>
              <SelectItem value="in_transit">Em Rota</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Rastreio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== "all"
                        ? "Nenhum envio encontrado com os filtros aplicados"
                        : "Nenhum envio cadastrado"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.map((shipment) => (
                  <TableRow key={shipment.shipment_id}>
                    <TableCell className="font-mono font-medium">
                      #{shipment.shipment_id}
                    </TableCell>
                    <TableCell className="font-mono">
                      {shipment.order_id ? `#${shipment.order_id}` : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {shipment.tracking_number || "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={shipment.status} 
                        substatus={shipment.substatus}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div>{formatBRT(shipment.last_update)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(shipment.last_update), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefresh(shipment.shipment_id)}
                        disabled={refreshingId === shipment.shipment_id}
                        title="Atualizar status agora"
                      >
                        {refreshingId === shipment.shipment_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">Atualizar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
