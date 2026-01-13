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

  const getStatusIcon = (status: PendingItem["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      case "syncing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusLabel = (status: PendingItem["status"]) => {
    switch (status) {
      case "pending":
        return "Aguardando";
      case "syncing":
        return "Sincronizando...";
      case "success":
        return "Vinculado";
      case "error":
        return "Erro";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com contadores e ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <Clock className="h-3 w-3" />
            {pendingCount} pendentes
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle className="h-3 w-3" />
            {syncedCount} sincronizados
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="gap-1.5"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar Agora
                </>
              )}
            </Button>
          )}
          
          {allItems.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearAll}
              className="text-muted-foreground"
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de sync automático */}
      {pendingCount > 0 && !isSyncing && (
        <div className="text-xs text-muted-foreground text-center py-1 bg-muted/50 rounded">
          ⏱️ Sincronização automática a cada 30 segundos
        </div>
      )}

      {/* Lista de itens */}
      {allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">Nenhum pacote escaneado</p>
          <p className="text-sm">Escaneie QR codes para adicionar à fila</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-2">
          <div className="space-y-2">
            {allItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  item.status === "pending" && "bg-warning/5 border-warning/30",
                  item.status === "syncing" && "bg-primary/5 border-primary/30",
                  item.status === "success" && "bg-success/5 border-success/30",
                  item.status === "error" && "bg-destructive/5 border-destructive/30",
                  index === 0 && item.status === "pending" && "animate-pulse"
                )}
              >
                {/* Ícone de status */}
                <div className="flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium truncate">
                      {item.shipmentId}
                    </span>
                    {item.accountNickname && (
                      <Badge variant="outline" className="text-xs">
                        {item.accountNickname}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {getStatusLabel(item.status)}
                    </span>
                    {item.shipmentStatus && (
                      <span className="text-xs text-muted-foreground">
                        • {item.shipmentStatus}
                      </span>
                    )}
                    {item.errorMessage && (
                      <span className="text-xs text-destructive truncate">
                        • {item.errorMessage}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      • {formatDistanceToNow(item.scannedAt, { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>

                {/* Botão remover */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 opacity-50 hover:opacity-100"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
