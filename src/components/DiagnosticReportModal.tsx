import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DiagnosticReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: any;
  cleanupResult?: any;
  onCleanup?: () => void;
  isCleaning?: boolean;
}

export default function DiagnosticReportModal({ 
  open, 
  onOpenChange, 
  report, 
  cleanupResult,
  onCleanup,
  isCleaning = false 
}: DiagnosticReportModalProps) {
  if (!report) return null;

  const hasIssues = 
    report.issues.orphaned_alerts.length > 0 ||
    report.issues.duplicate_alerts.length > 0 ||
    report.issues.alerts_on_delivered_shipments.length > 0 ||
    report.issues.alerts_on_missing_shipments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Relatório de Diagnóstico - FASE 1.1
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Executado em {new Date(report.timestamp).toLocaleString('pt-BR')}
          </p>
        </DialogHeader>

        {/* Resumo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de Alertas</p>
                <p className="text-2xl font-bold">{report.summary.total_alerts}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alertas Pendentes</p>
                <p className="text-2xl font-bold text-orange-500">{report.summary.pending_alerts}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alertas Resolvidos</p>
                <p className="text-2xl font-bold text-green-500">{report.summary.resolved_alerts}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Envios com Alertas</p>
                <p className="text-2xl font-bold">{report.summary.shipments_with_alerts}</p>
              </div>
              <div className="col-span-2 md:col-span-2">
                <p className="text-sm text-muted-foreground">Divergência de Contadores</p>
                <p className={`text-2xl font-bold ${report.summary.divergence > 10 ? 'text-red-500' : 'text-green-500'}`}>
                  {report.summary.divergence > 0 ? '+' : ''}{report.summary.divergence}
                  {report.summary.divergence > 10 && ' ⚠️ CRÍTICO'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Problemas Identificados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {hasIssues ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Problemas Identificados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alertas Órfãos */}
            {report.issues.orphaned_alerts.length > 0 && (
              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Alertas Órfãos ({report.issues.orphaned_alerts.length})
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Alertas que não possuem um shipment correspondente
                </p>
                <div className="space-y-2">
                  {report.issues.orphaned_alerts.slice(0, 5).map((alert: any) => (
                    <div key={alert.id} className="text-sm bg-muted p-2 rounded">
                      <p className="font-mono">{alert.shipment_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.alert_type} • Detectado {formatDistanceToNow(new Date(alert.detected_at), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  ))}
                  {report.issues.orphaned_alerts.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ... e mais {report.issues.orphaned_alerts.length - 5} alertas órfãos
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Alertas Duplicados */}
            {report.issues.duplicate_alerts.length > 0 && (
              <div className="border-l-4 border-yellow-500 pl-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Alertas Duplicados ({report.issues.duplicate_alerts.length} grupos)
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Múltiplos alertas do mesmo tipo para o mesmo shipment
                </p>
                <div className="space-y-2">
                  {report.issues.duplicate_alerts.slice(0, 5).map((dup: any, idx: number) => (
                    <div key={idx} className="text-sm bg-muted p-2 rounded">
                      <p className="font-mono">{dup.shipment_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Tipo: {dup.alert_type} • <Badge variant="destructive">{dup.count} duplicatas</Badge>
                      </p>
                    </div>
                  ))}
                  {report.issues.duplicate_alerts.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ... e mais {report.issues.duplicate_alerts.length - 5} grupos duplicados
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Alertas em Envios Finalizados */}
            {report.issues.alerts_on_delivered_shipments.length > 0 && (
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  Alertas em Envios Finalizados ({report.issues.alerts_on_delivered_shipments.length})
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Alertas pendentes para envios com status 'delivered' ou 'not_delivered'
                </p>
                <div className="space-y-2">
                  {report.issues.alerts_on_delivered_shipments.slice(0, 5).map((alert: any) => (
                    <div key={alert.id} className="text-sm bg-muted p-2 rounded">
                      <p className="font-mono">{alert.shipment_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: <Badge>{alert.status}</Badge> • {alert.alert_type}
                      </p>
                    </div>
                  ))}
                  {report.issues.alerts_on_delivered_shipments.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ... e mais {report.issues.alerts_on_delivered_shipments.length - 5} alertas
                    </p>
                  )}
                </div>
              </div>
            )}

            {!hasIssues && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-semibold">✅ Nenhuma inconsistência detectada!</p>
                <p className="text-sm text-muted-foreground">
                  Todos os alertas estão sincronizados corretamente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recomendações */}
        {report.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Recomendações</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Resultado da Limpeza */}
        {cleanupResult && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-500" />
                Resultado da Limpeza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-red-500">{cleanupResult.orphaned_removed}</p>
                  <p className="text-xs text-muted-foreground">Órfãos Removidos</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-yellow-500">{cleanupResult.duplicates_consolidated}</p>
                  <p className="text-xs text-muted-foreground">Duplicados Consolidados</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg col-span-2">
                  <p className="text-2xl font-bold text-blue-500">{cleanupResult.delivered_resolved}</p>
                  <p className="text-xs text-muted-foreground">Finalizados Resolvidos</p>
                </div>
              </div>
              <div className="text-center py-4 border-t">
                <p className="text-3xl font-bold text-green-500">{cleanupResult.total_cleaned}</p>
                <p className="text-sm text-muted-foreground">Total de Itens Corrigidos</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer com Ações */}
        {hasIssues && !cleanupResult && (
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {onCleanup && (
              <Button 
                onClick={onCleanup} 
                disabled={isCleaning}
                className="bg-green-500 hover:bg-green-600"
              >
                {isCleaning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Corrigindo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Corrigir Agora
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
