import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Package, Truck, LayoutDashboard, LogOut, Menu, Link2, AlertCircle, Settings, Scan, AlertTriangle, TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// MLAccountSelector removido

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      navigate("/auth");
    }
  };

  const NavLinks = () => (
    <>
      <Link to="/dashboard">
        <Button
          variant={location.pathname === "/dashboard" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link to="/envios">
        <Button
          variant={location.pathname === "/envios" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <Package className="mr-2 h-4 w-4" />
          Envios
        </Button>
      </Link>
      <Link to="/motoristas">
        <Button
          variant={location.pathname === "/motoristas" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <Truck className="mr-2 h-4 w-4" />
          Motoristas
        </Button>
      </Link>
      <Link to="/transportadoras">
        <Button
          variant={location.pathname === "/transportadoras" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <TruckIcon className="mr-2 h-4 w-4" />
          Transportadoras
        </Button>
      </Link>
      <Link to="/vincular">
        <Button
          variant={location.pathname === "/vincular" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <Link2 className="mr-2 h-4 w-4" />
          Vincular Venda
        </Button>
      </Link>
      <Link to="/bipagem">
        <Button
          variant={location.pathname === "/bipagem" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <Scan className="mr-2 h-4 w-4" />
          Bipagem
        </Button>
      </Link>
      <Link to="/pendencias">
        <Button
          variant={location.pathname === "/pendencias" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Pendências
        </Button>
      </Link>
      <Link to="/alertas">
        <Button
          variant={location.pathname === "/alertas" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Alertas
        </Button>
      </Link>
      <Link to="/config-ml">
        <Button
          variant={location.pathname === "/config-ml" ? "default" : "ghost"}
          className="w-full justify-start"
        >
          <Settings className="mr-2 h-4 w-4" />
          Config ML
        </Button>
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <div className="flex flex-col gap-2">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">RASTREIO_FLEX</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex px-4 py-6">
        {/* Sidebar Desktop */}
        <aside className="hidden w-64 flex-col gap-2 pr-6 md:flex">
          <NavLinks />
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
