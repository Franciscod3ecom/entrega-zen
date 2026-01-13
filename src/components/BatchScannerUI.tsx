import { PendingItem } from "@/hooks/useBatchScanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Clock, AlertCircle, Loader2, X, Package, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BatchScannerUIProps {
  pendingItems: PendingItem[];
  syncedItems: PendingItem[];
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  onSyncNow: () => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export function BatchScannerUI({
  pendingItems,
  syncedItems,
  isSyncing,
  pendingCount,
  syncedCount,
  onSyncNow,
  onRemoveItem,
  onClearAll,
}: BatchScannerUIProps) {
  const allItems = [...pendingItems, ...syncedItems].sort(
    (a, b) => b.scannedAt.getTime() - a.scannedAt.getTime()
  );

  const getStatusConfig = (status: PendingItem["status"]) => {
    switch (status) {
      case "pending":
        return { 
          icon: Clock, 
          label: "Aguardando",
          className: "bg-warning/10 text-warning border-warning/20"
        };
      case "syncing":
        return { 
          icon: Loader2, 
          label: "Sincronizando...",
          className: "bg-primary/10 text-primary border-primary/20",
          iconClassName: "animate-spin"
        };
      case "success":
        return { 
          icon: CheckCircle, 
          label: "Vinculado",
          className: "bg-success/10 text-success border-success/20"
        };
      case "error":
        return { 
          icon: AlertCircle, 
          label: "Erro",
          className: "bg-destructive/10 text-destructive border-destructive/20"
        };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with counters and actions */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5" />
            {pendingCount} pendentes
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1.5 rounded-lg">
            <CheckCircle className="h-3.5 w-3.5" />
            {syncedCount} vinculados
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="rounded-lg h-9"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Sincronizando
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Sincronizar
                </>
              )}
            </Button>
          )}
          
          {allItems.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearAll}
              className="rounded-lg h-9 text-muted-foreground"
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Auto sync indicator */}
      {pendingCount > 0 && !isSyncing && (
        <div className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded-lg mt-3">
          ⏱️ Sincronização automática a cada 30 segundos
        </div>
      )}

      {/* Items list */}
      {allItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Nenhum pacote escaneado</p>
          <p className="text-sm mt-1">Escaneie QR codes para adicionar à fila</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 mt-4 -mx-2">
          <div className="space-y-2 px-2">
            {allItems.map((item, index) => {
              const config = getStatusConfig(item.status);
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                    config.className,
                    index === 0 && item.status === "pending" && "animate-pulse"
                  )}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    <StatusIcon className={cn("h-5 w-5", config.iconClassName)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold truncate">
                        {item.shipmentId}
                      </span>
                      {item.accountNickname && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 rounded-md border-current/30">
                          {item.accountNickname}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs opacity-80 flex-wrap">
                      <span>{config.label}</span>
                      {item.shipmentStatus && (
                        <span>• {item.shipmentStatus}</span>
                      )}
                      {item.errorMessage && (
                        <span className="text-destructive truncate">• {item.errorMessage}</span>
                      )}
                      <span>• {formatDistanceToNow(item.scannedAt, { addSuffix: true, locale: ptBR })}</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 opacity-60 hover:opacity-100 rounded-lg"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
