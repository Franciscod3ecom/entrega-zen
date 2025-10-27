import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Envios from "./pages/Envios";
import Motoristas from "./pages/Motoristas";
import Transportadoras from "./pages/Transportadoras";
import VincularVenda from "./pages/VincularVenda";
import Bipagem from "./pages/Bipagem";
import Pendencias from "./pages/Pendencias";
import Alertas from "./pages/Alertas";
import ConfigML from "./pages/ConfigML";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componente de rota protegida
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/envios" element={<ProtectedRoute><Envios /></ProtectedRoute>} />
          <Route path="/motoristas" element={<ProtectedRoute><Motoristas /></ProtectedRoute>} />
          <Route path="/transportadoras" element={<ProtectedRoute><Transportadoras /></ProtectedRoute>} />
          <Route path="/vincular" element={<ProtectedRoute><VincularVenda /></ProtectedRoute>} />
          <Route path="/bipagem" element={<ProtectedRoute><Bipagem /></ProtectedRoute>} />
          <Route path="/pendencias" element={<ProtectedRoute><Pendencias /></ProtectedRoute>} />
          <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
          <Route path="/config-ml" element={<ProtectedRoute><ConfigML /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
