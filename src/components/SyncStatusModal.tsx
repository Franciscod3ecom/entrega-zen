import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Clock,
  Package,
  Activity,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyncAccountResult {
  account: string;
  imported: number;
  errors: number;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export interface SyncProgress {
  phase: 'starting' | 'syncing' | 'refreshing' | 'checking' | 'complete' | 'error';
  currentAccount: string | null;
  accountsProcessed: number;
  totalAccounts: number;
  imported: number;
  errors: number;
  accountResults: SyncAccountResult[];
  errorMessage?: string;
}

interface SyncStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  autoStart?: boolean;
}

const phaseLabels: Record<SyncProgress['phase'], string> = {
  starting: 'Iniciando sincronização...',
  syncing: 'Importando pedidos do Mercado Livre',
  refreshing: 'Atualizando status dos envios',
  checking: 'Verificando problemas',
  complete: 'Sincronização concluída!',
  error: 'Erro na sincronização',
};

const phaseIcons: Record<SyncProgress['phase'], typeof Loader2> = {
  starting: Loader2,
  syncing: Package,
  refreshing: RefreshCw,
  checking: Activity,
  complete: CheckCircle2,
  error: XCircle,
};

export default function SyncStatusModal({ 
  open, 
  onOpenChange, 
  onComplete,
  autoStart = true 
}: SyncStatusModalProps) {
  const [progress, setProgress] = useState<SyncProgress>({
    phase: 'starting',
    currentAccount: null,
    accountsProcessed: 0,
    totalAccounts: 0,
    imported: 0,
    errors: 0,
    accountResults: [],
  });
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (open && autoStart && !isRunning) {
      runSync();
    }
  }, [open, autoStart]);

  const runSync = async () => {
    setIsRunning(true);
    setProgress({
      phase: 'starting',
      currentAccount: null,
      accountsProcessed: 0,
      totalAccounts: 0,
      imported: 0,
      errors: 0,
      accountResults: [],
    });

    try {
      // Fase 1: Buscar contas para mostrar progresso inicial
      const { data: accounts } = await supabase
        .from('ml_accounts')
        .select('id, nickname, ml_user_id');

      const totalAccounts = accounts?.length || 0;
      const initialResults: SyncAccountResult[] = (accounts || []).map(acc => ({
        account: acc.nickname || `ML ${acc.ml_user_id}`,
        imported: 0,
        errors: 0,
        status: 'pending' as const,
      }));

      setProgress(prev => ({
        ...prev,
        phase: 'syncing',
        totalAccounts,
        accountResults: initialResults,
      }));

      // Fase 2: Sincronizar todas as contas
      const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-all-accounts", {
        body: { days_back: 7 },
      });

      if (syncError) throw syncError;

      // Atualizar resultados por conta
      const accountResults: SyncAccountResult[] = (syncData?.accounts || []).map((acc: any) => ({
        account: acc.account,
        imported: acc.imported,
        errors: acc.errors,
        status: acc.errors > 0 ? 'error' : 'done',
      }));

      setProgress(prev => ({
        ...prev,
        phase: 'refreshing',
        accountsProcessed: totalAccounts,
        imported: syncData?.imported || 0,
        errors: syncData?.errors || 0,
        accountResults,
      }));

      // Fase 3: Atualizar status dos envios
      await supabase.functions.invoke("auto-refresh-shipments");

      setProgress(prev => ({
        ...prev,
        phase: 'checking',
      }));

      // Fase 4: Verificar problemas
      await supabase.functions.invoke("check-stuck-shipments");

      // Fase 5: Concluído
      setProgress(prev => ({
        ...prev,
        phase: 'complete',
      }));

      toast.success(`✅ Sincronização concluída! ${syncData?.imported || 0} envios importados`);
      onComplete?.();

    } catch (error: any) {
      console.error('[SyncStatusModal] Erro:', error);
      setProgress(prev => ({
        ...prev,
        phase: 'error',
        errorMessage: error.message || 'Erro desconhecido',
      }));
      toast.error(error.message || 'Erro na sincronização');
    } finally {
      setIsRunning(false);
    }
  };

  const getProgressPercentage = () => {
    switch (progress.phase) {
      case 'starting': return 5;
      case 'syncing': return 30;
      case 'refreshing': return 60;
      case 'checking': return 85;
      case 'complete': return 100;
      case 'error': return progress.accountsProcessed > 0 ? 50 : 10;
      default: return 0;
    }
  };

  const PhaseIcon = phaseIcons[progress.phase];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress.phase === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : progress.phase === 'error' ? (
              <XCircle className="h-5 w-5 text-danger" />
            ) : (
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            )}
            Sincronização
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-ios-4 py-ios-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex items-center justify-between text-caption1 text-text-tertiary">
              <span>{getProgressPercentage()}%</span>
              <span>{phaseLabels[progress.phase]}</span>
            </div>
          </div>

          {/* Fase atual com ícone */}
          <div className={cn(
            "flex items-center gap-3 p-ios-3 rounded-ios-md",
            progress.phase === 'complete' && "bg-success/10",
            progress.phase === 'error' && "bg-danger/10",
            !['complete', 'error'].includes(progress.phase) && "bg-primary/10"
          )}>
            <PhaseIcon className={cn(
              "h-5 w-5",
              progress.phase === 'complete' && "text-success",
              progress.phase === 'error' && "text-danger",
              !['complete', 'error'].includes(progress.phase) && "text-primary animate-spin"
            )} />
            <span className="text-callout font-medium">
              {phaseLabels[progress.phase]}
            </span>
          </div>

          {/* Lista de contas */}
          {progress.accountResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-caption1 text-text-tertiary">Contas processadas:</p>
              {progress.accountResults.map((account, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-ios-3 rounded-ios-md transition-colors",
                    account.status === 'processing' && "bg-primary/10",
                    account.status === 'done' && "bg-success/5",
                    account.status === 'error' && "bg-danger/5",
                    account.status === 'pending' && "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {account.status === 'processing' ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : account.status === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : account.status === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-danger" />
                    ) : (
                      <Clock className="h-4 w-4 text-text-tertiary" />
                    )}
                    <span className="text-callout truncate max-w-[150px]">
                      {account.account}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.imported > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{account.imported}
                      </Badge>
                    )}
                    {account.errors > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {account.errors} erros
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estatísticas finais */}
          {(progress.imported > 0 || progress.errors > 0) && (
            <div className="grid grid-cols-2 gap-ios-3 pt-ios-3 border-t border-border-subtle">
              <div className="text-center p-ios-3 rounded-ios-md bg-success/5">
                <div className="text-title-md font-bold text-success">{progress.imported}</div>
                <p className="text-caption2 text-text-tertiary">Importados</p>
              </div>
              <div className="text-center p-ios-3 rounded-ios-md bg-danger/5">
                <div className="text-title-md font-bold text-danger">{progress.errors}</div>
                <p className="text-caption2 text-text-tertiary">Erros</p>
              </div>
            </div>
          )}

          {/* Mensagem de erro */}
          {progress.phase === 'error' && progress.errorMessage && (
            <div className="p-ios-3 rounded-ios-md bg-danger/10 text-danger text-callout">
              {progress.errorMessage}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-ios-2">
            {progress.phase === 'complete' || progress.phase === 'error' ? (
              <Button 
                onClick={() => onOpenChange(false)} 
                className="w-full"
                variant={progress.phase === 'complete' ? 'default' : 'outline'}
              >
                {progress.phase === 'complete' ? 'Fechar' : 'Cancelar'}
              </Button>
            ) : (
              <Button 
                onClick={() => onOpenChange(false)} 
                variant="outline"
                className="w-full"
                disabled
              >
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </Button>
            )}
            
            {progress.phase === 'error' && (
              <Button 
                onClick={runSync} 
                className="w-full"
              >
                Tentar Novamente
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook para calcular próxima sincronização automática
export function useNextSyncTime() {
  const [nextSync, setNextSync] = useState<string>('');

  useEffect(() => {
    const calculateNext = () => {
      const schedules = [6, 10, 14, 18, 21]; // horários BRT
      const now = new Date();
      
      // Converter para BRT
      const nowBRT = new Date(now.toLocaleString('en-US', { timeZone: 'America/Recife' }));
      const currentHour = nowBRT.getHours();
      
      const nextHour = schedules.find(h => h > currentHour) || schedules[0];
      const isNextDay = nextHour <= currentHour;
      
      setNextSync(`${nextHour.toString().padStart(2, '0')}:00${isNextDay ? ' (amanhã)' : ''}`);
    };

    calculateNext();
    const interval = setInterval(calculateNext, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, []);

  return nextSync;
}
