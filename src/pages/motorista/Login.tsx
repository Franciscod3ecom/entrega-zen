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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button variant="ghost" size="icon" asChild>
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
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Truck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Portal do Motorista</h1>
            <p className="text-muted-foreground mt-1">
              RASTREIO_FLEX
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Entrar</CardTitle>
              <CardDescription>
                Acesse com suas credenciais de motorista
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-semibold"
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
          <p className="text-center text-sm text-muted-foreground mt-6">
            Suas credenciais foram fornecidas pelo administrador.<br />
            Em caso de dúvidas, entre em contato com seu gestor.
          </p>
        </div>
      </div>
    </div>
  );
}
