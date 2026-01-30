import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, Package, CheckCircle, Clock, AlertTriangle, 
  Scan, LogOut, RefreshCw, Loader2, MapPin, User
} from "lucide-react";
import { useDriverAuth } from "@/hooks/useDriverAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRT } from "@/lib/date-utils";
import { toast } from "sonner";

interface DriverShipment {
  shipment_id: string;
  order_id: string | null;
  tracking_number: string | null;
  status: string;
  substatus: string | null;
  cliente_nome: string | null;
  cidade: string | null;
  estado: string | null;
  last_ml_update: string | null;
  assigned_at: string | null;
  scanned_at: string | null;
  returned_at: string | null;
}

export default function MotoristaDashboard() {
  const navigate = useNavigate();
  const { user, driver, isDriver, isLoading: authLoading, signOut } = useDriverAuth();
  
  const [shipments, setShipments] = useState<DriverShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadShipments = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const { data, error } = await supabase
        .from("v_rastreamento_completo")
        .select("*")
        .eq("driver_id", driver.id)
        .order("last_ml_update", { ascending: false });

      if (error) throw error;

      setShipments(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar envios:", err);
      toast.error("Erro ao carregar seus pacotes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driver?.id]);

  useEffect(() => {
    if (!authLoading && !isDriver) {
      navigate("/motorista/login");
      return;
    }

    if (driver?.id) {
      loadShipments();
    }
  }, [authLoading, isDriver, driver, navigate, loadShipments]);

  // Realtime subscription
  useEffect(() => {
    if (!driver?.id) return;

    const channel = supabase
      .channel("driver-shipments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_assignments",
          filter: `driver_id=eq.${driver.id}`,
        },
        () => {
          loadShipments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id, loadShipments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShipments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-success/10 text-success border-success/30";
      case "not_delivered":
        return "bg-danger/10 text-danger border-danger/30";
      case "shipped":
      case "out_for_delivery":
        return "bg-primary/10 text-primary border-primary/30";
      case "ready_to_ship":
        return "bg-warning/10 text-warning border-warning/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ready_to_ship: "Pronto",
      shipped: "Em Trânsito",
      out_for_delivery: "Saiu p/ Entrega",
      delivered: "Entregue",
      not_delivered: "Não Entregue",
    };
    return labels[status] || status;
  };

  // Métricas
  const metrics = {
    total: shipments.length,
    pendentes: shipments.filter(s => !["delivered", "not_delivered"].includes(s.status)).length,
    entregues: shipments.filter(s => s.status === "delivered").length,
    naoEntregues: shipments.filter(s => s.status === "not_delivered").length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{driver?.name || "Motorista"}</p>
              <p className="text-xs text-muted-foreground">{driver?.phone}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">{metrics.total}</div>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-warning" />
              <div className="text-xl font-bold text-warning">{metrics.pendentes}</div>
              <p className="text-[10px] text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-success" />
              <div className="text-xl font-bold text-success">{metrics.entregues}</div>
              <p className="text-[10px] text-muted-foreground">Entregues</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-danger" />
              <div className="text-xl font-bold text-danger">{metrics.naoEntregues}</div>
              <p className="text-[10px] text-muted-foreground">Devolver</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button 
            className="flex-1 h-14 rounded-2xl text-lg font-semibold" 
            asChild
          >
            <Link to="/motorista/bipar">
              <Scan className="h-5 w-5 mr-2" />
              Bipar Pacotes
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-14 w-14 rounded-2xl"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Lista de pacotes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Seus Pacotes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum pacote atribuído</p>
              </div>
            ) : (
              <ScrollArea className="h-[50vh]">
                <div className="divide-y">
                  {shipments.map((shipment) => (
                    <div key={shipment.shipment_id} className="p-4 hover:bg-muted/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium truncate">
                              {shipment.shipment_id}
                            </span>
                            <Badge className={`${getStatusColor(shipment.status)} text-[10px]`}>
                              {getStatusLabel(shipment.status)}
                            </Badge>
                          </div>
                          
                          {shipment.cliente_nome && (
                            <p className="text-sm text-foreground truncate">
                              {shipment.cliente_nome}
                            </p>
                          )}
                          
                          {(shipment.cidade || shipment.estado) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[shipment.cidade, shipment.estado].filter(Boolean).join(", ")}
                            </p>
                          )}
                          
                          {shipment.last_ml_update && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Atualizado: {formatBRT(shipment.last_ml_update)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
