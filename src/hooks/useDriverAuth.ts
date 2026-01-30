import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  carrier_id: string | null;
  owner_user_id: string;
}

interface UseDriverAuthReturn {
  user: User | null;
  session: Session | null;
  driver: DriverInfo | null;
  isDriver: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useDriverAuth(): UseDriverAuthReturn {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do motorista vinculado ao usuário
  const fetchDriverData = useCallback(async (userId: string) => {
    try {
      // Verificar se usuário tem role 'driver'
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "driver")
        .maybeSingle();

      if (roleError) {
        console.error("Erro ao verificar role:", roleError);
        setIsDriver(false);
        return;
      }

      if (!roleData) {
        setIsDriver(false);
        setDriver(null);
        return;
      }

      setIsDriver(true);

      // Buscar dados do motorista vinculado
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true)
        .maybeSingle();

      if (driverError) {
        console.error("Erro ao buscar motorista:", driverError);
        setError("Erro ao carregar dados do motorista");
        return;
      }

      if (driverData) {
        setDriver(driverData);
      } else {
        setError("Motorista não encontrado ou inativo");
      }
    } catch (err: any) {
      console.error("Erro ao buscar dados:", err);
      setError(err.message || "Erro desconhecido");
    }
  }, []);

  useEffect(() => {
    // Listener de auth state PRIMEIRO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Usar setTimeout para evitar deadlock
          setTimeout(() => {
            fetchDriverData(session.user.id);
          }, 0);
        } else {
          setDriver(null);
          setIsDriver(false);
        }
      }
    );

    // ENTÃO verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchDriverData(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchDriverData]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setIsLoading(false);
        
        // Traduzir erros comuns
        if (signInError.message.includes("Invalid login credentials")) {
          return { error: "Email ou senha incorretos" };
        }
        if (signInError.message.includes("Email not confirmed")) {
          return { error: "Email não confirmado. Verifique sua caixa de entrada." };
        }
        
        return { error: signInError.message };
      }

      if (data.user) {
        await fetchDriverData(data.user.id);
      }

      setIsLoading(false);
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      return { error: err.message || "Erro ao fazer login" };
    }
  }, [fetchDriverData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setDriver(null);
    setIsDriver(false);
    navigate("/motorista/login");
  }, [navigate]);

  return {
    user,
    session,
    driver,
    isDriver,
    isLoading,
    error,
    signIn,
    signOut,
  };
}
