import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Package, Truck, LogOut, Menu, Link2, Settings, Scan, TruckIcon, Route, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  shortLabel?: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Dashboard", shortLabel: "Início" },
  { to: "/operacoes", icon: Route, label: "Operações Unificadas", shortLabel: "Operações" },
  { to: "/bipagem", icon: Scan, label: "Bipagem", shortLabel: "Bipar" },
  { to: "/motoristas", icon: Truck, label: "Motoristas" },
  { to: "/transportadoras", icon: TruckIcon, label: "Transportadoras" },
  { to: "/vincular", icon: Link2, label: "Vincular Venda", shortLabel: "Vincular" },
  { to: "/config-ml", icon: Settings, label: "Config ML", shortLabel: "Config" },
];

// Mobile bottom navigation items (most used)
const bottomNavItems: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Início" },
  { to: "/bipagem", icon: Scan, label: "Bipar" },
  { to: "/operacoes", icon: Route, label: "Operações" },
  { to: "/config-ml", icon: Settings, label: "Config" },
];

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

  const isActive = (path: string) => location.pathname === path;

  const NavLinks = () => (
    <div className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Link key={item.to} to={item.to}>
          <Button
            variant={isActive(item.to) ? "gold" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-12 text-base",
              isActive(item.to) && "shadow-primary"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Button>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header - Liquid Glass */}
      <header className="sticky top-0 z-40 w-full liquid-glass border-b border-border">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 pt-12 liquid-glass border-border">
                <NavLinks />
                <div className="mt-8 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 text-danger hover:text-danger hover:bg-danger/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-gold">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold hidden sm:block text-gold-gradient">RASTREIO_FLEX</span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="hidden md:flex h-10 w-10 hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex px-4 py-4 md:py-6">
        {/* Sidebar Desktop */}
        <aside className="hidden w-56 flex-shrink-0 pr-6 md:block lg:w-64">
          <div className="sticky top-20">
            <NavLinks />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 animate-fade-in">{children}</main>
      </div>

      {/* Bottom Navigation - Mobile only */}
      <nav className="bottom-nav md:hidden">
        <div className="flex justify-around items-center h-14">
          {bottomNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors touch-feedback",
                isActive(item.to) 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform",
                isActive(item.to) && "scale-110"
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
