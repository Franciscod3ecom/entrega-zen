import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Scan, Type, CheckCircle, Users, Package, X, Zap, Clock, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import BarcodeScanner from "@/components/BarcodeScanner";
import { BatchScannerUI } from "@/components/BatchScannerUI";
import { useBatchScanner } from "@/hooks/useBatchScanner";
import { Badge } from "@/components/ui/badge";

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
    errorCount,
  } = useBatchScanner({
    driverId: selectedDriver,
    autoSyncIntervalMs: 30000, // Sync automático a cada 30s
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
      // Feedback de duplicata/inválido
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
  
  // Total de itens na sessão
  const totalItems = pendingItems.length + syncedItems.length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Banner Sticky durante scan */}
        {isScanning && selectedDriverData && (
          <div className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Package className="h-6 w-6" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center font-bold">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {selectedDriverData.name}
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Modo Rápido
                    </Badge>
                  </div>
                  <div className="text-sm opacity-90 flex items-center gap-3">
                    <span>{syncedCount} vinculados</span>
                    {pendingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pendingCount} aguardando
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={syncNow}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleStopScanning}
                >
                  <X className="h-4 w-4 mr-1" />
                  Parar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">Bipagem Rápida</h1>
          <p className="text-muted-foreground">
            Escaneie múltiplos pacotes instantaneamente - sincronização automática em background
          </p>
        </div>

        {/* Seleção de Motorista */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Passo 1: Selecione o Motorista
            </CardTitle>
            <CardDescription>
              Todos os pacotes escaneados serão vinculados a este motorista
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label>Motorista</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um motorista ativo" />
                </SelectTrigger>
                <SelectContent>
                  {driversLoading ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : drivers && drivers.length > 0 ? (
                    drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} - {driver.phone}
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
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Motorista selecionado:</strong> {selectedDriverData.name}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scanner */}
        {selectedDriver && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Passo 2: Escaneie as Etiquetas
                <Badge variant="outline" className="ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  Modo Rápido
                </Badge>
              </CardTitle>
              <CardDescription>
                Escaneie continuamente - os pacotes são adicionados à fila instantaneamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Botão para ativar/desativar scanner */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => isScanning ? handleStopScanning() : setIsScanning(true)}
                  variant={isScanning ? "destructive" : "default"}
                  className="flex-1"
                  disabled={!selectedDriver}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {isScanning ? 'Parar Scanner' : 'Iniciar Scanner Rápido'}
                </Button>
              </div>

              {/* Componente de Scanner */}
              {isScanning && (
                <div className="border rounded-lg overflow-hidden bg-black">
                  <BarcodeScanner
                    onScan={handleScanResult}
                    isActive={isScanning}
                  />
                </div>
              )}

              {/* Explicação do modo rápido */}
              <Alert className="border-primary/30 bg-primary/5">
                <Zap className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <strong>💡 Modo Rápido:</strong> Os códigos são capturados instantaneamente e sincronizados 
                  em background a cada 30 segundos ou ao parar o scanner. Isso permite bipar dezenas de 
                  pacotes sem esperar!
                </AlertDescription>
              </Alert>

              {/* Entrada Manual */}
              <div className="pt-4 border-t space-y-3">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Entrada Manual (fallback)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o código da etiqueta"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  />
                  <Button 
                    onClick={handleManualSubmit}
                    disabled={!manualCode.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fila de Bipagem */}
        {selectedDriver && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Fila de Pacotes
                {totalItems > 0 && (
                  <Badge variant="secondary">{totalItems}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Pacotes escaneados nesta sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {/* Link para operações */}
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link to="/operacoes">
              Ver Rastreamento Completo →
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
