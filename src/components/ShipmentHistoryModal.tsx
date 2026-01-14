import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Package, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ShipmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  mlUserId: number;
}

interface HistoryEvent {
  date: string;
  status: string;
  substatus: string | null;
  description: string | null;
  location: string | null;
}

export default function ShipmentHistoryModal({
  isOpen,
  onClose,
  shipmentId,
  mlUserId,
}: ShipmentHistoryModalProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = async () => {
    if (!mlUserId || mlUserId === 0) {
      toast.error("Conta ML não identificada para este envio");
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-shipment-history", {
        body: { shipment_id: shipmentId, ml_user_id: mlUserId },
      });

      if (error) throw error;

      setEvents(data.events || []);
    } catch (error: any) {
      console.error("Erro ao buscar histórico:", error);
      toast.error(error.message || "Erro ao buscar histórico do envio");
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar histórico quando o modal abre
  useEffect(() => {
    if (isOpen && events.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-success text-success-foreground";
      case "not_delivered":
        return "bg-destructive text-destructive-foreground";
      case "shipped":
      case "out_for_delivery":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Histórico do Envio
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Shipment ID: {shipmentId}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum evento encontrado no histórico</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div
                key={index}
                className="relative pl-8 pb-6 border-l-2 border-border last:border-l-0 last:pb-0"
              >
                {/* Bolinha na linha do tempo */}
                <div className="absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background" />

                <div className="space-y-2">
                  {/* Status e data */}
                  <div className="flex items-start justify-between gap-4">
                    <Badge className={getStatusBadgeColor(event.status)}>
                      {event.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(event.date), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Substatus */}
                  {event.substatus && (
                    <p className="text-sm text-muted-foreground">
                      Substatus: <span className="font-medium">{event.substatus}</span>
                    </p>
                  )}

                  {/* Descrição */}
                  {event.description && (
                    <p className="text-sm">{event.description}</p>
                  )}

                  {/* Localização */}
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}

                  {/* Data completa */}
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {!isLoading && events.length > 0 && (
            <Button onClick={loadHistory} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
