import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Mail, Lock, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useDriverAuth } from "@/hooks/useDriverAuth";

export default function MotoristaLogin() {
  const navigate = useNavigate();
  const { signIn, isLoading, isDriver } = useDriverAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validação básica
    if (!email.trim()) {
      setError("Digite seu email");
      setIsSubmitting(false);
      return;
    }

    if (!password.trim()) {
      setError("Digite sua senha");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    // Login bem sucedido - redirecionar
    navigate("/motorista/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se já está logado como motorista, redirecionar
  if (isDriver) {
    navigate("/motorista/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button variant="ghost" size="icon" asChild className="h-11 w-11 rounded-ios-md ios-pressed">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-ios-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-gold">
              <Truck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-title-lg">Portal do Motorista</h1>
            <p className="text-callout text-text-secondary mt-1">
              RASTREIO_FLEX
            </p>
          </div>

          <Card variant="ios" className="ios-card-shadow">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-title-sm">Entrar</CardTitle>
              <CardDescription className="text-callout text-text-secondary">
                Acesse com suas credenciais de motorista
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-ios-4">
                {error && (
                  <Alert variant="destructive" className="rounded-ios-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-callout">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-ios-md"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-callout">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 rounded-ios-md"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="ios-primary"
                  size="ios-default"
                  className="w-full ios-pressed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Help text */}
          <p className="text-center text-footnote text-text-tertiary mt-6">
            Suas credenciais foram fornecidas pelo administrador.<br />
            Em caso de dúvidas, entre em contato com seu gestor.
          </p>
        </div>
      </div>
    </div>
  );
}
