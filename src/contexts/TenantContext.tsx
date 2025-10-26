import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  setCurrentTenant: (tenant: Tenant) => void;
  loading: boolean;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(() => {
    // Tentar restaurar do cache imediatamente
    const cached = localStorage.getItem('currentTenant');
    return cached ? JSON.parse(cached) : null;
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        setLoading(false);
        return;
      }

      const userId = session.session.user.id;

      // Buscar tenant do usuário via memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select('tenant_id, tenants(id, name, created_at)')
        .eq('user_id', userId)
        .limit(1)
        .single();

      let userTenant: Tenant | null = null;

      if (membershipError || !memberships) {
        // Se não existe membership, criar tenant e membership automaticamente
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();

        const tenantName = profile?.name ? `Workspace de ${profile.name}` : 'Meu Workspace';

        // Criar tenant
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({ name: tenantName })
          .select()
          .single();

        if (tenantError) throw tenantError;

        // Criar membership
        const { error: newMembershipError } = await supabase
          .from('memberships')
          .insert({ user_id: userId, tenant_id: newTenant.id, role: 'admin' });

        if (newMembershipError) throw newMembershipError;

        userTenant = newTenant;
      } else {
        userTenant = (memberships as any).tenants;
      }

      if (userTenant) {
        setTenants([userTenant]);
        setCurrentTenantState(userTenant);
        localStorage.setItem('currentTenantId', userTenant.id);
        localStorage.setItem('currentTenant', JSON.stringify(userTenant));
      }
    } catch (error) {
      console.error('Erro ao carregar tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentTenant = (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    localStorage.setItem('currentTenantId', tenant.id);
    localStorage.setItem('currentTenant', JSON.stringify(tenant));
  };

  const refreshTenants = async () => {
    await loadTenants();
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        tenants,
        setCurrentTenant,
        loading,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
}
