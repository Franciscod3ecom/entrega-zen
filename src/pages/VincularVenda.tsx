import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRT } from "@/lib/date-utils";
import { Loader2, Search, Link as LinkIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useMLAccount } from "@/contexts/MLAccountContext";

export default function VincularVenda() {
  const { currentTenant } = useTenant();
  const { currentAccount } = useMLAccount();
  const [inputId, setInputId] = useState("");
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
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

  const handleSearch = async () => {
    if (!inputId.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um ID válido",
        variant: "destructive",
      });
      return;
    }

    if (!currentTenant || !currentAccount) {
      toast({
        title: "Erro",
        description: "Selecione workspace e conta ML",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setShipmentData(null);

    try {
      const { data, error } = await supabase.functions.invoke('resolve-shipment', {
        body: { 
          input_id: inputId.trim(),
          tenant_id: currentTenant.id,
          ml_user_id: currentAccount.ml_user_id,
        },
      });

      if (error) throw error;

      setShipmentData(data);
      toast({
        title: "Sucesso",
        description: "Envio encontrado!",
      });
    } catch (error: any) {
      console.error('Erro ao buscar envio:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao buscar envio. Verifique o ID informado.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async () => {
    if (!selectedDriver) {
      toast({
        title: "Erro",
        description: "Selecione um motorista",
        variant: "destructive",
      });
      return;
    }

    if (!shipmentData) {
      toast({
        title: "Erro",
        description: "Nenhum envio carregado",
        variant: "destructive",
      });
      return;
    }

    if (!currentTenant || !currentAccount) {
      toast({
        title: "Erro",
        description: "Nenhum workspace ou conta ML selecionada",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);

    try {
      // Buscar ml_account_id
      const { data: mlAccount } = await supabase
        .from('ml_accounts')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('ml_user_id', currentAccount.ml_user_id)
        .single();

      if (!mlAccount) {
        throw new Error('Conta ML não encontrada');
      }

      const { error } = await supabase
        .from('driver_assignments')
        .insert({
          driver_id: selectedDriver,
          shipment_id: shipmentData.shipment_id,
          tenant_id: currentTenant.id,
          ml_account_id: mlAccount.id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Envio vinculado ao motorista com sucesso!",
      });

      // Limpar formulário
      setInputId("");
      setShipmentData(null);
      setSelectedDriver("");
    } catch (error: any) {
      console.error('Erro ao vincular:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao vincular envio ao motorista",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Vincular Venda a Motorista</h1>
          <p className="text-muted-foreground">
            Busque por Order ID, Pack ID ou Shipment ID e vincule a um motorista
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buscar Envio</CardTitle>
            <CardDescription>
              Digite o Order ID, Pack ID ou Shipment ID do Mercado Livre
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">💡 Dica importante:</p>
              <p>Se a compra foi um <strong>carrinho</strong> (múltiplos produtos), informe o <strong>Pack ID</strong>. Um pack pode conter vários pedidos mas geralmente tem um único envio.</p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Ex: 1234567890, MLB1234567890"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>

            {shipmentData && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Envio Encontrado</span>
                    <StatusBadge 
                      status={shipmentData.status} 
                      substatus={shipmentData.substatus}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold">Shipment ID:</p>
                      <p className="text-muted-foreground font-mono">{shipmentData.shipment_id}</p>
                    </div>
                    {shipmentData.order_id && (
                      <div>
                        <p className="font-semibold">Order ID:</p>
                        <p className="text-muted-foreground font-mono">{shipmentData.order_id}</p>
                      </div>
                    )}
                    {shipmentData.pack_id && (
                      <div>
                        <p className="font-semibold">Pack ID:</p>
                        <p className="text-muted-foreground font-mono">{shipmentData.pack_id}</p>
                      </div>
                    )}
                    {shipmentData.tracking_number && (
                      <div>
                        <p className="font-semibold">Rastreamento:</p>
                        <p className="text-muted-foreground font-mono">{shipmentData.tracking_number}</p>
                      </div>
                    )}
                  </div>
                  
                  {shipmentData.raw_data?.date_created && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Última atualização ML: {formatBRT(shipmentData.raw_data.date_created)}
                    </div>
                  )}

                  <div className="pt-4 space-y-3 border-t">
                    <div>
                      <Label>Selecione o Motorista</Label>
                      <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha um motorista" />
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
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleLink}
                      disabled={isLinking || !selectedDriver}
                    >
                      {isLinking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                      <span className="ml-2">Vincular ao Motorista</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
