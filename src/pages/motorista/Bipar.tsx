import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  ArrowLeft, Scan, X, CheckCircle, Clock, Package, 
  ChevronUp, RefreshCw, Loader2, User, Zap
} from "lucide-react";
import { useDriverAuth } from "@/hooks/useDriverAuth";
import BarcodeScanner from "@/components/BarcodeScanner";
import { BatchScannerUI } from "@/components/BatchScannerUI";
import { useBatchScanner } from "@/hooks/useBatchScanner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MotoristaBipar() {
  const navigate = useNavigate();
  const { driver, isDriver, isLoading: authLoading } = useDriverAuth();
  
  const [isScanning, setIsScanning] = useState(false);

  const {
    pendingItems,
    syncedItems,
    addCode,
    syncNow,
    clearAll,
    removeItem,
    isSyncing,
    pendingCount,
    syncedCount,
  } = useBatchScanner({
    driverId: driver?.id || "",
    autoSyncIntervalMs: 30000,
    onSyncComplete: (results) => {
      const successCount = results.filter(r => r.status === "success").length;
      const errorCount = results.filter(r => r.status === "error").length;
      const duplicateCount = results.filter(r => r.status === "duplicate").length;
      
      if (successCount > 0) {
        toast.success(`✅ ${successCount} pacote${successCount > 1 ? 's' : ''} vinculado${successCount > 1 ? 's' : ''}`);
      }
      if (duplicateCount > 0) {
        toast.info(`${duplicateCount} já bipado${duplicateCount > 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erro${errorCount > 1 ? 's' : ''}`);
      }
    },
    onDuplicateScan: (shipmentId) => {
      toast.warning(`Pacote ${shipmentId} já foi bipado`);
    },
  });

  useEffect(() => {
    if (!authLoading && !isDriver) {
      navigate("/motorista/login");
    }
  }, [authLoading, isDriver, navigate]);

  const handleScanResult = (code: string) => {
    addCode(code);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    if (pendingCount > 0) {
      syncNow();
    }
  };

  const totalItems = pendingItems.length + syncedItems.length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Full screen scanner mode
  if (isScanning && driver) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Camera view */}
        <div className="absolute inset-0">
          <BarcodeScanner onScan={handleScanResult} isActive={isScanning} fullscreen />
        </div>

        {/* Top overlay - status */}
        <div className="absolute top-0 left-0 right-0 p-4 safe-top bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <p className="font-semibold">{driver.name}</p>
                <p className="text-xs opacity-80">{driver.phone}</p>
              </div>
            </div>
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
              <Zap className="h-3 w-3 mr-1" />
              Bipagem
            </Badge>
          </div>
        </div>

        {/* Scan indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
            <div className="absolute inset-0 border-2 border-white rounded-3xl animate-pulse" />
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 safe-bottom bg-gradient-to-t from-black/80 to-transparent">
          {/* Counter pill */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-4 px-5 py-3 bg-white/15 backdrop-blur-xl rounded-full">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-white font-semibold">{syncedCount}</span>
                <span className="text-white/70 text-sm">vinculados</span>
              </div>
              {pendingCount > 0 && (
                <>
                  <div className="w-px h-4 bg-white/30" />
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <span className="text-white font-semibold">{pendingCount}</span>
                    <span className="text-white/70 text-sm">aguardando</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {pendingCount > 0 && (
              <Button
                variant="secondary"
                onClick={syncNow}
                disabled={isSyncing}
                className="flex-1 h-14 rounded-2xl bg-white/20 backdrop-blur-sm text-white border-0 hover:bg-white/30"
              >
                <RefreshCw className={cn("h-5 w-5 mr-2", isSyncing && "animate-spin")} />
                Sincronizar
              </Button>
            )}
            <Button
              onClick={handleStopScanning}
              className="flex-1 h-14 rounded-2xl bg-white text-black font-semibold text-lg shadow-lg"
            >
              <X className="h-5 w-5 mr-2" />
              Concluir
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/motorista/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">Bipar Pacotes</h1>
            <p className="text-xs text-muted-foreground">{driver?.name}</p>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        {/* Start Scanner CTA */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg flex items-center justify-center mb-6">
          <Scan className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-center">Pronto para escanear</h2>
        <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
          Aponte a câmera para os QR codes das etiquetas
        </p>
        <Button
          onClick={() => setIsScanning(true)}
          size="lg"
          className="w-full max-w-sm h-14 rounded-2xl text-lg font-semibold shadow-lg"
          disabled={!driver?.id}
        >
          <Scan className="h-5 w-5 mr-3" />
          Iniciar Scanner
        </Button>

        {/* Voltar ao dashboard */}
        <Button variant="ghost" className="mt-6" asChild>
          <Link to="/motorista/dashboard">
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>

      {/* Package Queue - Bottom sheet */}
      {totalItems > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <button className="fixed bottom-4 left-4 right-4 h-16 rounded-2xl bg-card border shadow-lg flex items-center justify-between px-5 z-30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{totalItems} pacotes</p>
                  <p className="text-xs text-muted-foreground">
                    {syncedCount} vinculados • {pendingCount} pendentes
                  </p>
                </div>
              </div>
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Fila de Pacotes
                <Badge variant="secondary">{totalItems}</Badge>
              </SheetTitle>
            </SheetHeader>
            <BatchScannerUI
              pendingItems={pendingItems}
              syncedItems={syncedItems}
              isSyncing={isSyncing}
              pendingCount={pendingCount}
              syncedCount={syncedCount}
              onSyncNow={syncNow}
              onRemoveItem={removeItem}
              onClearAll={clearAll}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
