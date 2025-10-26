import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRT } from "@/lib/date-utils";
import { Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function Pendencias() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const { data: pendencias, isLoading } = useQuery({
    queryKey: ['pendencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_assignments')
        .select(`
          id,
          shipment_id,
          assigned_at,
          note,
          drivers (
            name,
            phone
          ),
          shipments_cache (
            status,
            substatus,
            tracking_number,
            last_ml_update
          )
        `)
        .is('returned_at', null)
        .order('assigned_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Atualizar a cada 30s
  });

  const handleRefresh = async (assignmentId: string, shipmentId: string) => {
    setRefreshingId(assignmentId);

    try {
      const { error } = await supabase.functions.invoke('refresh-shipment', {
        body: { shipment_id: shipmentId },
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['pendencias'] });

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status",
        variant: "destructive",
      });
    } finally {
      setRefreshingId(null);
    }
  };

  const handleMarkReturned = async (assignmentId: string) => {
    setReturningId(assignmentId);

    try {
      const { error } = await supabase
        .from('driver_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['pendencias'] });

      toast({
        title: "Sucesso",
        description: "Envio marcado como devolvido ao estoque!",
      });
    } catch (error: any) {
      console.error('Erro ao marcar devolução:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar devolução",
        variant: "destructive",
      });
    } finally {
      setReturningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pendências por Motorista</h1>
        <p className="text-muted-foreground">
          Envios atribuídos aos motoristas que ainda não foram devolvidos ao estoque
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Envios Pendentes ({pendencias?.length || 0})</CardTitle>
          <CardDescription>
            Lista de envios que saíram com motoristas e ainda não retornaram
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!pendencias || pendencias.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhuma pendência encontrada</p>
              <p className="text-sm">Todos os envios foram devolvidos ao estoque</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Shipment ID</TableHead>
                    <TableHead>Status Atual</TableHead>
                    <TableHead>Última Atualização ML</TableHead>
                    <TableHead>Atribuído em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendencias.map((pendencia: any) => (
                    <TableRow key={pendencia.id}>
                      <TableCell className="font-medium">
                        {pendencia.drivers?.name || 'N/A'}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {pendencia.drivers?.phone || ''}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {pendencia.shipment_id}
                      </TableCell>
                      <TableCell>
                        {pendencia.shipments_cache ? (
                          <StatusBadge
                            status={pendencia.shipments_cache.status}
                            substatus={pendencia.shipments_cache.substatus}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Não cacheado
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {pendencia.shipments_cache?.last_ml_update ? (
                          <div>
                            <div>{formatBRT(pendencia.shipments_cache.last_ml_update)}</div>
                            <div className="text-xs text-muted-foreground">
                              Atualizado há {Math.round((Date.now() - new Date(pendencia.shipments_cache.last_ml_update).getTime()) / 60000)} min
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem cache</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatBRT(pendencia.assigned_at)}
                      </TableCell>
                       <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefresh(pendencia.id, pendencia.shipment_id)}
                          disabled={refreshingId === pendencia.id}
                          title="Atualizar status agora"
                        >
                          {refreshingId === pendencia.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">Atualizar</span>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkReturned(pendencia.id)}
                          disabled={returningId === pendencia.id}
                        >
                          {returningId === pendencia.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span className="ml-1">Devolvido</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
