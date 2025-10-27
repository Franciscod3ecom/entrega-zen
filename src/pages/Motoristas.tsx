import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Removido: import { useTenant } from "@/contexts/TenantContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Plus, Phone, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Driver {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  created_at: string;
  carrier_id: string | null;
  carriers?: {
    name: string;
  } | null;
}

interface Carrier {
  id: string;
  name: string;
}

export default function Motoristas() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", carrier_id: "" });
  // Removido: const { currentTenant } = useTenant();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    loadDrivers();
    loadCarriers();
  }, [navigate]);

  const loadDrivers = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("*, carriers(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar motoristas");
    } else {
      setDrivers(data || []);
    }
  };

  const loadCarriers = async () => {
    const { data, error } = await supabase
      .from("carriers")
      .select("id, name")
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("Erro ao carregar transportadoras:", error);
    } else {
      setCarriers(data || []);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriver.name || !newDriver.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Buscar owner_user_id do usuário autenticado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("drivers").insert([
      {
        name: newDriver.name,
        phone: newDriver.phone,
        carrier_id: newDriver.carrier_id || null,
        active: true,
        owner_user_id: user.id,
      },
    ]);

    if (error) {
      toast.error("Erro ao adicionar motorista");
    } else {
      toast.success("Motorista adicionado com sucesso!");
      setIsDialogOpen(false);
      setNewDriver({ name: "", phone: "", carrier_id: "" });
      loadDrivers();
    }
  };

  const toggleDriverStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("drivers")
      .update({ active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado!");
      loadDrivers();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Motoristas</h1>
            <p className="text-muted-foreground">
              Gerencie a equipe de entregadores
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Motorista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Motorista</DialogTitle>
                <DialogDescription>
                  Adicione um novo motorista à equipe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do motorista"
                    value={newDriver.name}
                    onChange={(e) =>
                      setNewDriver({ ...newDriver, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={newDriver.phone}
                    onChange={(e) =>
                      setNewDriver({ ...newDriver, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier">Transportadora</Label>
                  <Select 
                    value={newDriver.carrier_id} 
                    onValueChange={(value) => setNewDriver({ ...newDriver, carrier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma transportadora (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {carriers.map((carrier) => (
                        <SelectItem key={carrier.id} value={carrier.id}>
                          {carrier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddDriver}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      Nenhum motorista cadastrado
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {driver.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.carriers?.name ? (
                        <Badge variant="outline">{driver.carriers.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.active ? (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(driver.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDriverStatus(driver.id, driver.active)}
                      >
                        {driver.active ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
