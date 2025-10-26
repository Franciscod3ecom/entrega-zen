import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Package, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Entregue
          </Badge>
        );
      case "not_delivered":
        return (
          <Badge className="bg-danger text-danger-foreground">
            <XCircle className="mr-1 h-3 w-3" />
            Não Entregue
          </Badge>
        );
      case "in_transit":
        return (
          <Badge className="bg-secondary text-secondary-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Em Rota
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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
                <TableHead>ID Envio</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Rastreio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Substatus</TableHead>
                <TableHead>Última Atualização</TableHead>
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
                    <TableCell className="font-medium">
                      #{shipment.shipment_id}
                    </TableCell>
                    <TableCell>
                      {shipment.order_id ? `#${shipment.order_id}` : "-"}
                    </TableCell>
                    <TableCell>
                      {shipment.tracking_number || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                    <TableCell>
                      {shipment.substatus || "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(shipment.last_update).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
