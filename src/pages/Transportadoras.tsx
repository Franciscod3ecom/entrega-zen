import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Carrier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
}

const Transportadoras = () => {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCarrier, setNewCarrier] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadCarriers();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadCarriers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("carriers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCarriers(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar transportadoras:", error);
      toast({
        title: "Erro ao carregar transportadoras",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCarrier = async () => {
    if (!newCarrier.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome da transportadora.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("carriers").insert({
        name: newCarrier.name,
        contact_name: newCarrier.contact_name || null,
        phone: newCarrier.phone || null,
        email: newCarrier.email || null,
        owner_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Transportadora adicionada",
        description: "A transportadora foi cadastrada com sucesso.",
      });

      setDialogOpen(false);
      setNewCarrier({ name: "", contact_name: "", phone: "", email: "" });
      loadCarriers();
    } catch (error: any) {
      console.error("Erro ao adicionar transportadora:", error);
      toast({
        title: "Erro ao adicionar transportadora",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleCarrierStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("carriers")
        .update({ active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Transportadora ${!currentStatus ? "ativada" : "desativada"} com sucesso.`,
      });

      loadCarriers();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Transportadoras</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as transportadoras cadastradas
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transportadora
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Transportadora</DialogTitle>
                <DialogDescription>
                  Preencha as informações da nova transportadora
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={newCarrier.name}
                    onChange={(e) =>
                      setNewCarrier({ ...newCarrier, name: e.target.value })
                    }
                    placeholder="Ex: Transportadora Express"
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Nome do Contato</Label>
                  <Input
                    id="contact"
                    value={newCarrier.contact_name}
                    onChange={(e) =>
                      setNewCarrier({ ...newCarrier, contact_name: e.target.value })
                    }
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newCarrier.phone}
                    onChange={(e) =>
                      setNewCarrier({ ...newCarrier, phone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCarrier.email}
                    onChange={(e) =>
                      setNewCarrier({ ...newCarrier, email: e.target.value })
                    }
                    placeholder="contato@transportadora.com"
                  />
                </div>
                <Button onClick={handleAddCarrier} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Lista de Transportadoras
            </CardTitle>
            <CardDescription>
              Transportadoras cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : carriers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-2" />
                <p>Nenhuma transportadora cadastrada</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carriers.map((carrier) => (
                      <TableRow key={carrier.id}>
                        <TableCell className="font-medium">
                          {carrier.name}
                        </TableCell>
                        <TableCell>{carrier.contact_name || "-"}</TableCell>
                        <TableCell>{carrier.phone || "-"}</TableCell>
                        <TableCell>{carrier.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={carrier.active ? "default" : "secondary"}>
                            {carrier.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(carrier.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCarrierStatus(carrier.id, carrier.active)}
                          >
                            {carrier.active ? "Desativar" : "Ativar"}
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
    </Layout>
  );
};

export default Transportadoras;
