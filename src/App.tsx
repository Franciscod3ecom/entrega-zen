import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import { MLAccountProvider } from "./contexts/MLAccountContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Envios from "./pages/Envios";
import Motoristas from "./pages/Motoristas";
import VincularVenda from "./pages/VincularVenda";
import Bipagem from "./pages/Bipagem";
import Pendencias from "./pages/Pendencias";
import ConfigML from "./pages/ConfigML";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TenantProvider>
          <MLAccountProvider>
            <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/envios" element={<Envios />} />
            <Route path="/motoristas" element={<Motoristas />} />
            <Route path="/vincular" element={<VincularVenda />} />
            <Route path="/bipagem" element={<Bipagem />} />
            <Route path="/pendencias" element={<Pendencias />} />
            <Route path="/config-ml" element={<ConfigML />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </MLAccountProvider>
        </TenantProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
