import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Share, MoreVertical, Plus, Check, ArrowLeft, Apple, Chrome } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | "unknown";

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detectar plataforma
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    if (isIOS) {
      setPlatform("ios");
    } else if (isAndroid) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Erro ao instalar:", error);
    } finally {
      setInstalling(false);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-3xl bg-success/20 flex items-center justify-center mb-6">
          <Check className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">App Instalado!</h1>
        <p className="text-muted-foreground text-center mb-8">
          O RASTREIO_FLEX já está instalado no seu dispositivo.
        </p>
        <Button asChild>
          <Link to="/dashboard">
            Ir para o Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-semibold">Instalar App</h1>
      </div>

      <div className="p-6 space-y-6 max-w-md mx-auto">
        {/* Hero */}
        <div className="text-center py-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Smartphone className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">RASTREIO_FLEX</h2>
          <p className="text-muted-foreground">
            Instale o app no seu celular para acesso rápido
          </p>
        </div>

        {/* Benefícios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por que instalar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Acesso direto da tela inicial</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Funciona como app nativo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Carrega mais rápido</span>
            </div>
          </CardContent>
        </Card>

        {/* Instruções por plataforma */}
        {platform === "ios" && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                <CardTitle className="text-lg">iPhone / iPad</CardTitle>
              </div>
              <CardDescription>
                Siga os passos abaixo para instalar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-500">1</span>
                </div>
                <div>
                  <p className="font-medium">Toque no botão Compartilhar</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Share className="h-4 w-4" /> Na barra inferior do Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-500">2</span>
                </div>
                <div>
                  <p className="font-medium">Selecione "Adicionar à Tela de Início"</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Role para baixo se necessário
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-500">3</span>
                </div>
                <div>
                  <p className="font-medium">Toque em "Adicionar"</p>
                  <p className="text-sm text-muted-foreground">
                    O app aparecerá na sua tela inicial
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {platform === "android" && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                <CardTitle className="text-lg">Android</CardTitle>
              </div>
              <CardDescription>
                {deferredPrompt 
                  ? "Clique no botão abaixo para instalar" 
                  : "Siga os passos para instalar"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deferredPrompt ? (
                <Button 
                  onClick={handleInstallClick} 
                  className="w-full h-14 text-lg"
                  disabled={installing}
                >
                  <Download className="h-5 w-5 mr-2" />
                  {installing ? "Instalando..." : "Instalar App"}
                </Button>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-green-500">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Toque no menu do navegador</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MoreVertical className="h-4 w-4" /> Os três pontinhos no canto
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-green-500">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Selecione "Instalar app" ou "Adicionar à tela inicial"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-green-500">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Confirme a instalação</p>
                      <p className="text-sm text-muted-foreground">
                        O app aparecerá na sua tela inicial
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {platform === "desktop" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                <CardTitle className="text-lg">Desktop (Chrome)</CardTitle>
              </div>
              <CardDescription>
                {deferredPrompt 
                  ? "Clique no botão abaixo para instalar" 
                  : "Siga os passos para instalar"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deferredPrompt ? (
                <Button 
                  onClick={handleInstallClick} 
                  className="w-full h-12"
                  disabled={installing}
                >
                  <Download className="h-5 w-5 mr-2" />
                  {installing ? "Instalando..." : "Instalar App"}
                </Button>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Clique no ícone de instalação</p>
                    <p className="text-sm text-muted-foreground">
                      Na barra de endereço do Chrome, clique no ícone de instalação
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Link para continuar */}
        <div className="text-center pt-4">
          <Button variant="ghost" asChild>
            <Link to="/auth">
              Continuar no navegador
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
