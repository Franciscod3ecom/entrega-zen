import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Scan, Type, CheckCircle, Users, Package, X, Zap, Clock, RefreshCw, ChevronUp, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import BarcodeScanner from "@/components/BarcodeScanner";
import { BatchScannerUI } from "@/components/BatchScannerUI";
import { useBatchScanner } from "@/hooks/useBatchScanner";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export default function Bipagem() {
  const [selectedDriver, setSelectedDriver] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  // Hook de batch scanning
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
    driverId: selectedDriver,
    autoSyncIntervalMs: 30000,
    onSyncComplete: (results) => {
      const successCount = results.filter(r => r.status === "success").length;
      const errorCount = results.filter(r => r.status === "error").length;
      
      if (successCount > 0) {
        toast({
          title: `✅ ${successCount} pacote${successCount > 1 ? 's' : ''} vinculado${successCount > 1 ? 's' : ''}`,
          description: errorCount > 0 ? `${errorCount} erro${errorCount > 1 ? 's' : ''}` : undefined,
        });
      } else if (errorCount > 0) {
        toast({
          title: `❌ ${errorCount} erro${errorCount > 1 ? 's' : ''} ao vincular`,
          variant: "destructive",
        });
      }
    },
  });

  // Carregar motoristas
  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Handler para scan do QR code
  const handleScanResult = (code: string) => {
    const added = addCode(code);
    if (!added) {
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 20, 30]);
      }
    }
  };

  // Handler para entrada manual
  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite um código válido",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDriver) {
      toast({
        title: "Erro", 
        description: "Selecione um motorista primeiro",
        variant: "destructive",
      });
      return;
    }

    const added = addCode(manualCode);
    if (added) {
      setManualCode("");
    } else {
      toast({
        title: "Código inválido ou duplicado",
        description: "Verifique o código e tente novamente",
        variant: "destructive",
      });
    }
  };

  // Sincronizar ao parar o scanner
  const handleStopScanning = () => {
    setIsScanning(false);
    if (pendingCount > 0) {
      syncNow();
    }
  };

  const selectedDriverData = drivers?.find(d => d.id === selectedDriver);
  const totalItems = pendingItems.length + syncedItems.length;

  // Full screen scanner mode
  if (isScanning && selectedDriverData) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Camera view */}
        <div className="absolute inset-0">
          <BarcodeScanner onScan={handleScanResult} isActive={isScanning} />
        </div>

        {/* Top overlay - status */}
        <div className="absolute top-0 left-0 right-0 p-4 safe-top bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <p className="font-semibold">{selectedDriverData.name}</p>
                <p className="text-xs opacity-80">{selectedDriverData.phone}</p>
              </div>
            </div>
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
              <Zap className="h-3 w-3 mr-1" />
              Modo Rápido
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
              className="flex-1 h-14 rounded-2xl bg-white text-black font-semibold text-lg shadow-lg touch-feedback"
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
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Bipagem Rápida</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Escaneie múltiplos pacotes instantaneamente
          </p>
        </div>

        {/* Driver Selection - Mobile optimized */}
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Selecione o Motorista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="h-12 rounded-xl text-base">
                <SelectValue placeholder="Escolha um motorista" />
              </SelectTrigger>
              <SelectContent>
                {driversLoading ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : drivers && drivers.length > 0 ? (
                  drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{driver.name}</span>
                        <span className="text-muted-foreground text-sm">• {driver.phone}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Nenhum motorista ativo
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {selectedDriverData && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">{selectedDriverData.name}</p>
                  <p className="text-xs text-success/80">Pronto para bipar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Start Scanner - Large CTA */}
        {selectedDriver && !isScanning && (
          <div className="flex flex-col items-center justify-center py-8 px-4 animate-scale-in">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-primary shadow-primary flex items-center justify-center mb-6">
              <Scan className="h-10 w-10 md:h-12 md:w-12 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-center">Pronto para escanear</h2>
            <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
              Aponte a câmera para os QR codes das etiquetas. Escaneie continuamente sem pausas!
            </p>
            <Button
              onClick={() => setIsScanning(true)}
              size="lg"
              className="w-full max-w-sm h-14 rounded-2xl text-lg font-semibold shadow-primary touch-feedback"
            >
              <Camera className="h-5 w-5 mr-3" />
              Iniciar Scanner Rápido
            </Button>

            {/* Manual input */}
            <div className="w-full max-w-sm mt-8 pt-6 border-t">
              <Label className="text-sm text-muted-foreground mb-2 block">
                <Type className="h-4 w-4 inline mr-2" />
                Ou digite manualmente
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Código da etiqueta"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  className="h-12 rounded-xl"
                />
                <Button 
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="h-12 px-6 rounded-xl"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Package Queue - Bottom sheet trigger */}
        {selectedDriver && totalItems > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <button className="fixed bottom-20 left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto w-auto md:w-full h-16 rounded-2xl bg-card border shadow-lg flex items-center justify-between px-5 touch-feedback z-30">
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

        {/* Link to operations */}
        <div className="flex justify-center pt-4">
          <Button variant="ghost" asChild className="text-muted-foreground">
            <Link to="/operacoes">
              Ver Rastreamento Completo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
