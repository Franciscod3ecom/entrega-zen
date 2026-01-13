import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingItem {
  id: string;
  code: string;
  shipmentId: string;
  scannedAt: Date;
  status: "pending" | "syncing" | "success" | "error";
  errorMessage?: string;
  accountNickname?: string;
  shipmentStatus?: string;
}

interface UseBatchScannerOptions {
  driverId: string;
  autoSyncIntervalMs?: number;
  onSyncComplete?: (results: PendingItem[]) => void;
}

interface UseBatchScannerReturn {
  pendingItems: PendingItem[];
  syncedItems: PendingItem[];
  addCode: (code: string) => boolean;
  syncNow: () => Promise<void>;
  clearAll: () => void;
  removeItem: (id: string) => void;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}

const COOLDOWN_MS = 3000;
const AUTO_SYNC_INTERVAL = 30000; // 30 segundos

export function useBatchScanner({
  driverId,
  autoSyncIntervalMs = AUTO_SYNC_INTERVAL,
  onSyncComplete,
}: UseBatchScannerOptions): UseBatchScannerReturn {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [syncedItems, setSyncedItems] = useState<PendingItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const recentCodesRef = useRef<Map<string, number>>(new Map());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extrair shipment ID do código (QR JSON, URL, ou ID direto)
  const extractShipmentId = useCallback((code: string): string | null => {
    let shipmentId = code.trim();

    // Tentar JSON do QR Mercado Livre
    try {
      const parsed = JSON.parse(code);
      if (parsed.id) {
        return String(parsed.id);
      }
    } catch {
      // Não é JSON
    }

    // Tentar extrair de URL
    const urlMatch = code.match(/shipments?[\/:](\d+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Validar se é numérico
    if (/^\d+$/.test(shipmentId)) {
      return shipmentId;
    }

    return null;
  }, []);

  // Adicionar código à fila (instantâneo, sem API call)
  const addCode = useCallback((code: string): boolean => {
    const shipmentId = extractShipmentId(code);
    
    if (!shipmentId) {
      console.log("[BatchScanner] Código inválido:", code.substring(0, 50));
      return false;
    }

    // Verificar cooldown
    const now = Date.now();
    const lastScanned = recentCodesRef.current.get(shipmentId);
    if (lastScanned && now - lastScanned < COOLDOWN_MS) {
      console.log("[BatchScanner] Código em cooldown:", shipmentId);
      return false;
    }

    // Verificar se já está na fila
    const existsInPending = pendingItems.some(item => item.shipmentId === shipmentId);
    const existsInSynced = syncedItems.some(item => item.shipmentId === shipmentId && item.status === "success");
    
    if (existsInPending || existsInSynced) {
      console.log("[BatchScanner] Código já processado:", shipmentId);
      return false;
    }

    // Registrar no cooldown
    recentCodesRef.current.set(shipmentId, now);

    // Adicionar à fila
    const newItem: PendingItem = {
      id: `${shipmentId}-${now}`,
      code,
      shipmentId,
      scannedAt: new Date(),
      status: "pending",
    };

    setPendingItems(prev => [newItem, ...prev]);
    console.log("[BatchScanner] Código adicionado à fila:", shipmentId);

    // Feedback tátil
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Som de confirmação rápido
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 1000;
      gainNode.gain.value = 0.05;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.05);
    } catch {}

    return true;
  }, [extractShipmentId, pendingItems, syncedItems]);

  // Sincronizar todos os pendentes
  const syncNow = useCallback(async () => {
    const itemsToSync = pendingItems.filter(item => item.status === "pending");
    
    if (itemsToSync.length === 0 || isSyncing) {
      return;
    }

    console.log(`[BatchScanner] Iniciando sync de ${itemsToSync.length} itens...`);
    setIsSyncing(true);

    // Marcar como "syncing"
    setPendingItems(prev => 
      prev.map(item => 
        item.status === "pending" ? { ...item, status: "syncing" as const } : item
      )
    );

    const results: PendingItem[] = [];

    // Processar em paralelo (máximo 5 simultâneos para não sobrecarregar)
    const batchSize = 5;
    for (let i = 0; i < itemsToSync.length; i += batchSize) {
      const batch = itemsToSync.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const { data, error } = await supabase.functions.invoke("scan-bind-auto", {
              body: {
                driver_id: driverId,
                shipment_id: item.shipmentId,
              },
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || "Erro desconhecido");

            return {
              ...item,
              status: "success" as const,
              accountNickname: data.account_nickname,
              shipmentStatus: data.status,
            };
          } catch (err: any) {
            console.error(`[BatchScanner] Erro ao sincronizar ${item.shipmentId}:`, err);
            return {
              ...item,
              status: "error" as const,
              errorMessage: err.message || "Erro ao vincular",
            };
          }
        })
      );

      results.push(...batchResults);
    }

    // Atualizar estados
    const successItems = results.filter(r => r.status === "success");
    const errorItems = results.filter(r => r.status === "error");

    // Mover itens sincronizados para syncedItems
    setSyncedItems(prev => [...successItems, ...prev]);
    
    // Atualizar pendingItems (manter erros para retry, remover sucessos)
    setPendingItems(prev => 
      prev.map(item => {
        const result = results.find(r => r.id === item.id);
        if (result) {
          return result.status === "error" ? { ...result, status: "pending" as const } : result;
        }
        return item;
      }).filter(item => item.status !== "success")
    );

    setIsSyncing(false);
    console.log(`[BatchScanner] Sync completo: ${successItems.length} sucesso, ${errorItems.length} erros`);

    // Feedback sonoro de conclusão
    if (successItems.length > 0) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.08;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
      } catch {}
    }

    onSyncComplete?.(results);
  }, [pendingItems, isSyncing, driverId, onSyncComplete]);

  // Limpar tudo
  const clearAll = useCallback(() => {
    setPendingItems([]);
    setSyncedItems([]);
    recentCodesRef.current.clear();
  }, []);

  // Remover item específico
  const removeItem = useCallback((id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
    setSyncedItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Auto-sync interval
  useEffect(() => {
    if (autoSyncIntervalMs > 0 && driverId) {
      syncIntervalRef.current = setInterval(() => {
        if (pendingItems.some(item => item.status === "pending")) {
          syncNow();
        }
      }, autoSyncIntervalMs);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [autoSyncIntervalMs, driverId, pendingItems, syncNow]);

  // Sync ao desmontar (cleanup)
  useEffect(() => {
    return () => {
      // Não chamar syncNow no cleanup pois pode já estar desmontado
      // O usuário deve clicar em "Sincronizar" antes de sair
    };
  }, []);

  return {
    pendingItems,
    syncedItems,
    addCode,
    syncNow,
    clearAll,
    removeItem,
    isSyncing,
    pendingCount: pendingItems.filter(i => i.status === "pending").length,
    syncedCount: syncedItems.filter(i => i.status === "success").length,
    errorCount: pendingItems.filter(i => i.status === "error").length + syncedItems.filter(i => i.status === "error").length,
  };
}
