import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Eye, EyeOff, Loader2, MessageCircle } from "lucide-react";

interface CreateDriverCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: {
    id: string;
    name: string;
  } | null;
  onSuccess: () => void;
}

export function CreateDriverCredentialsDialog({
  open,
  onOpenChange,
  driver,
  onSuccess,
}: CreateDriverCredentialsDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setCreatedCredentials(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    // Validations
    if (!email.trim()) {
      toast.error("Preencha o email");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Email inválido");
      return;
    }

    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!driver) {
      toast.error("Motorista não selecionado");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-driver-credentials",
        {
          body: {
            driver_id: driver.id,
            email: email.trim().toLowerCase(),
            password,
          },
        }
      );

      if (error) {
        console.error("Error creating credentials:", error);
        toast.error(error.message || "Erro ao criar credenciais");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Success - show credentials for copying
      setCreatedCredentials({
        email: email.trim().toLowerCase(),
        password,
        name: driver.name,
      });

      toast.success("Credenciais criadas com sucesso!");
      onSuccess();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Erro ao criar credenciais");
    } finally {
      setIsLoading(false);
    }
  };

  const getCredentialsText = () => {
    if (!createdCredentials) return "";
    return `🚚 *Acesso ao Portal do Motorista*

📱 Acesse: rastreioflex.lovable.app/motorista/login

👤 Email: ${createdCredentials.email}
🔑 Senha: ${createdCredentials.password}

Faça login para ver seus pacotes!`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getCredentialsText());
    setCopied(true);
    toast.success("Credenciais copiadas!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getCredentialsText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdCredentials ? "Credenciais Criadas" : "Criar Acesso ao Portal"}
          </DialogTitle>
          <DialogDescription>
            {createdCredentials
              ? `Compartilhe as credenciais com ${createdCredentials.name}`
              : `Crie email e senha para ${driver?.name || "o motorista"} acessar o portal`}
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 font-mono text-sm whitespace-pre-wrap">
              {getCredentialsText()}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copiado!" : "Copiar"}
              </Button>
              <Button
                variant="default"
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="motorista@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {createdCredentials ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Acesso
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
