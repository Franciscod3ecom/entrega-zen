import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function InstallAppPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Só mostra no mobile e se não foi dispensado recentemente
    if (!isMobile) return;
    
    // Verifica se já está instalado como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Verifica se foi dispensado nas últimas 24h
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) return;
    }

    // Mostra após 2 segundos
    const timer = setTimeout(() => setShowPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const handleDismiss = () => {
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const handleInstall = () => {
    navigate('/instalar');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in md:hidden">
      <div className="liquid-glass rounded-2xl p-4 shadow-lg border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-gold shrink-0">
            <Download className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">Instale o App</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesse mais rápido direto da tela inicial
            </p>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 h-9"
            onClick={handleDismiss}
          >
            Depois
          </Button>
          <Button 
            variant="gold" 
            size="sm" 
            className="flex-1 h-9"
            onClick={handleInstall}
          >
            Instalar
          </Button>
        </div>
      </div>
    </div>
  );
}
