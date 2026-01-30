import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

export function PWAUpdatePrompt() {
  const { showUpdatePrompt, updateApp, dismissUpdate } = usePWAUpdate();

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 md:left-auto md:right-4 md:w-80">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Nova versão disponível!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atualize para obter as últimas melhorias
            </p>
          </div>
          <button 
            onClick={dismissUpdate}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissUpdate}
            className="flex-1 h-9 rounded-xl text-xs"
          >
            Depois
          </Button>
          <Button
            size="sm"
            onClick={updateApp}
            className="flex-1 h-9 rounded-xl text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar Agora
          </Button>
        </div>
      </div>
    </div>
  );
}
