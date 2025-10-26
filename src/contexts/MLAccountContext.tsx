import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './TenantContext';

interface MLAccount {
  id: string;
  ml_user_id: number;
  nickname: string | null;
  site_id: string;
}

interface MLAccountContextType {
  currentAccount: MLAccount | null;
  accounts: MLAccount[];
  setCurrentAccount: (account: MLAccount | null) => void;
  loading: boolean;
  refreshAccounts: () => Promise<void>;
}

const MLAccountContext = createContext<MLAccountContextType | undefined>(undefined);

export function MLAccountProvider({ children }: { children: ReactNode }) {
  const [currentAccount, setCurrentAccountState] = useState<MLAccount | null>(null);
  const [accounts, setAccounts] = useState<MLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTenant } = useTenant();

  const loadAccounts = async () => {
    if (!currentTenant) {
      setAccounts([]);
      setCurrentAccountState(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ml_accounts')
        .select('id, ml_user_id, nickname, site_id')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAccounts(data || []);

      // Restaurar conta selecionada do localStorage ou usar a primeira
      const savedAccountId = localStorage.getItem(`ml_account_${currentTenant.id}`);
      if (savedAccountId && data) {
        const saved = data.find(acc => acc.id === savedAccountId);
        setCurrentAccountState(saved || data[0] || null);
      } else {
        setCurrentAccountState(data?.[0] || null);
      }
    } catch (error) {
      console.error('Erro ao carregar contas ML:', error);
      setAccounts([]);
      setCurrentAccountState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [currentTenant]);

  const setCurrentAccount = (account: MLAccount | null) => {
    setCurrentAccountState(account);
    if (account && currentTenant) {
      localStorage.setItem(`ml_account_${currentTenant.id}`, account.id);
    }
  };

  const refreshAccounts = async () => {
    setLoading(true);
    await loadAccounts();
  };

  return (
    <MLAccountContext.Provider
      value={{
        currentAccount,
        accounts,
        setCurrentAccount,
        loading,
        refreshAccounts,
      }}
    >
      {children}
    </MLAccountContext.Provider>
  );
}

export function useMLAccount() {
  const context = useContext(MLAccountContext);
  if (context === undefined) {
    throw new Error('useMLAccount deve ser usado dentro de um MLAccountProvider');
  }
  return context;
}
