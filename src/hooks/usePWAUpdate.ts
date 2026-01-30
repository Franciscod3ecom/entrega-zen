import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePWAUpdate() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registrado:', swUrl);
      
      // Verificar atualizações a cada 1 hora
      if (registration) {
        setInterval(() => {
          console.log('[PWA] Verificando atualizações...');
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Erro ao registrar SW:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      console.log('[PWA] Nova versão disponível!');
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const updateApp = () => {
    console.log('[PWA] Atualizando app...');
    updateServiceWorker(true);
    setShowUpdatePrompt(false);
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  return {
    showUpdatePrompt,
    updateApp,
    dismissUpdate,
    needRefresh,
  };
}
