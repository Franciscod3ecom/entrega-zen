import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRT } from "@/lib/date-utils";
import { Camera, Loader2, Scan, Type, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import BarcodeScanner from "@/components/BarcodeScanner";

interface ScannedItem {
  code: string;
  shipment_id: string;
  status: string;
  substatus?: string;
  timestamp: string;
  success: boolean;
}

export default function Bipagem() {
  const [selectedDriver, setSelectedDriver] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [lastScanned, setLastScanned] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const { toast } = useToast();

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

  const processCode = async (code: string, source: 'scanner' | 'manual' = 'scanner') => {
    // Debounce: evitar duplicados em <2s
    const now = Date.now();
    if (code === lastScanned && now - lastScanTime < 2000) {
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

    setLastScanned(code);
    setLastScanTime(now);
    setIsProcessing(true);

    try {
      // Chamar edge function para resolver e vincular
      const { data, error } = await supabase.functions.invoke('scan-bind', {
        body: { 
          driver_id: selectedDriver, 
          code: code.trim(),
          source 
        },
      });

      if (error) throw error;

      // Adicionar ao histórico
      const scannedItem: ScannedItem = {
        code: code,
        shipment_id: data.shipment_id,
        status: data.status,
        substatus: data.substatus,
        timestamp: new Date().toISOString(),
        success: true,
      };

      setScannedItems(prev => [scannedItem, ...prev.slice(0, 9)]); // Manter últimos 10

      toast({
        title: "✅ Vinculado!",
        description: `Shipment ${data.shipment_id} vinculado ao motorista`,
      });

      // Limpar campo manual
      if (source === 'manual') {
        setManualCode("");
      }

      // Bipe de sucesso (se suportado)
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }

    } catch (error: any) {
      console.error('Erro ao processar código:', error);
      
      const failedItem: ScannedItem = {
        code: code,
        shipment_id: '',
        status: 'error',
        timestamp: new Date().toISOString(),
        success: false,
      };

      setScannedItems(prev => [failedItem, ...prev.slice(0, 9)]);

      toast({
        title: "❌ Erro",
        description: error.message || "Não foi possível vincular o código",
        variant: "destructive",
      });

      // Bipe de erro
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite um código válido",
        variant: "destructive",
      });
      return;
    }
    processCode(manualCode, 'manual');
  };

  const handleScanResult = (code: string) => {
    processCode(code, 'scanner');
  };

  const selectedDriverData = drivers?.find(d => d.id === selectedDriver);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bipagem de Pacotes</h1>
          <p className="text-muted-foreground">
            Escaneie etiquetas para vincular automaticamente ao motorista
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
              </CardTitle>
              <CardDescription>
                Use a câmera ou digite manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Botão para ativar/desativar scanner */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsScanning(!isScanning)}
                  variant={isScanning ? "destructive" : "default"}
                  className="flex-1"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {isScanning ? 'Parar Scanner' : 'Iniciar Scanner'}
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

              {/* Status de processamento */}
              {isProcessing && (
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    Processando código...
                  </AlertDescription>
                </Alert>
              )}

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
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={handleManualSubmit}
                    disabled={isProcessing || !manualCode.trim()}
                  >
                    Vincular
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico da Sessão */}
        {scannedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico da Sessão</CardTitle>
              <CardDescription>
                Últimos {scannedItems.length} códigos processados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scannedItems.map((item, idx) => (
                  <div
                    key={`${item.code}-${idx}`}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      item.success 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {item.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-mono text-sm font-semibold">
                          {item.shipment_id || item.code}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatBRT(item.timestamp)}
                      </div>
                    </div>
                    {item.success && (
                      <StatusBadge status={item.status} substatus={item.substatus} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
