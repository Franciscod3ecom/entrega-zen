import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login realizado com sucesso!");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = authSchema.safeParse({ email, password, name });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: name || "Usuário",
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Você já pode fazer login.");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="blob-container">
        <div 
          className="blob blob-gold" 
          style={{ 
            width: '400px', 
            height: '400px', 
            top: '-100px', 
            right: '-100px',
            animationDelay: '0s'
          }} 
        />
        <div 
          className="blob blob-purple" 
          style={{ 
            width: '350px', 
            height: '350px', 
            bottom: '-50px', 
            left: '-100px',
            animationDelay: '-10s'
          }} 
        />
        <div 
          className="blob blob-gold" 
          style={{ 
            width: '200px', 
            height: '200px', 
            bottom: '20%', 
            right: '15%',
            opacity: 0.3,
            animationDelay: '-15s'
          }} 
        />
      </div>

      {/* Card */}
      <Card variant="ios" className="relative z-10 w-full max-w-md animate-fade-in-zoom ios-card-shadow">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-ios-lg bg-gradient-primary shadow-gold animate-pulse-gold">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-title-lg text-gold-gradient">RASTREIO_FLEX</CardTitle>
          <CardDescription className="text-callout text-text-secondary">Sistema de rastreamento Mercado Envios Flex</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-ios-lg p-1 mb-6">
              <TabsTrigger 
                value="login" 
                className="rounded-ios-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary ios-pressed"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-ios-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary ios-pressed"
              >
                Cadastro
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-ios-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-callout font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-ios-md"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-callout font-medium">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-ios-md"
                    required
                  />
                </div>
                <Button type="submit" variant="gold" size="ios-default" className="w-full ios-pressed" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignup} className="space-y-ios-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-callout font-medium">Nome</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-ios-md"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-callout font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-ios-md"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-callout font-medium">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-ios-md"
                    required
                  />
                </div>
                <Button type="submit" variant="gold" size="ios-default" className="w-full ios-pressed" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Driver Portal Link */}
          <div className="mt-6 pt-6 border-t border-border">
            <Button variant="ghost" asChild className="w-full h-12 rounded-ios-md ios-pressed gap-2">
              <Link to="/motorista/login">
                <Truck className="h-5 w-5" />
                Portal do Motorista
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
