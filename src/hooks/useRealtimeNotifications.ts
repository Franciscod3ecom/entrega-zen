import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface RealtimeNotification {
  id: string;
  type: "alert" | "status_change" | "assignment";
  title: string;
  message: string;
  shipmentId: string;
  timestamp: Date;
  read: boolean;
  priority: "high" | "medium" | "low";
}

interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isConnected: boolean;
}

const MAX_NOTIFICATIONS = 50;

export function useRealtimeNotifications(): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const addNotification = useCallback((notification: RealtimeNotification) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });
  }, []);

  const getAlertTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      not_scanned: "Não Bipado",
      missing_shipment: "Envio Ausente",
      duplicate_scan: "Bipagem Duplicada",
      stale_status: "Status Parado",
      no_driver: "Sem Motorista",
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      ready_to_ship: "Pronto para Envio",
      shipped: "Em Trânsito",
      delivered: "Entregue",
      not_delivered: "Não Entregue",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const getPriorityFromAlertType = (type: string): "high" | "medium" | "low" => {
    const highPriority = ["not_scanned", "missing_shipment", "stale_status"];
    const mediumPriority = ["duplicate_scan", "no_driver"];
    if (highPriority.includes(type)) return "high";
    if (mediumPriority.includes(type)) return "medium";
    return "low";
  };

  const getPriorityFromStatus = (status: string): "high" | "medium" | "low" => {
    if (status === "not_delivered") return "high";
    if (status === "delivered") return "low";
    return "medium";
  };

  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Create a single channel for all tables
      const channel = supabase
        .channel("realtime-notifications")
        // Listen to new alerts
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "shipment_alerts",
            filter: `owner_user_id=eq.${userId}`,
          },
          (payload) => {
            const alert = payload.new as any;
            const notification: RealtimeNotification = {
              id: `alert-${alert.id}`,
              type: "alert",
              title: `🚨 Novo Alerta: ${getAlertTypeLabel(alert.alert_type)}`,
              message: `Envio ${alert.shipment_id} requer atenção`,
              shipmentId: alert.shipment_id,
              timestamp: new Date(),
              read: false,
              priority: getPriorityFromAlertType(alert.alert_type),
            };
            addNotification(notification);
            toast.warning(notification.title, {
              description: notification.message,
              duration: 5000,
            });
          }
        )
        // Listen to alert resolutions
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shipment_alerts",
            filter: `owner_user_id=eq.${userId}`,
          },
          (payload) => {
            const alert = payload.new as any;
            const oldAlert = payload.old as any;
            
            // Only notify when resolved
            if (oldAlert.status === "pending" && alert.status === "resolved") {
              const notification: RealtimeNotification = {
                id: `alert-resolved-${alert.id}-${Date.now()}`,
                type: "alert",
                title: `✅ Alerta Resolvido`,
                message: `${getAlertTypeLabel(alert.alert_type)} do envio ${alert.shipment_id}`,
                shipmentId: alert.shipment_id,
                timestamp: new Date(),
                read: false,
                priority: "low",
              };
              addNotification(notification);
              toast.success(notification.title, {
                description: notification.message,
                duration: 3000,
              });
            }
          }
        )
        // Listen to shipment status changes
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shipments_cache",
            filter: `owner_user_id=eq.${userId}`,
          },
          (payload) => {
            const shipment = payload.new as any;
            const oldShipment = payload.old as any;

            // Only notify on status change
            if (oldShipment.status !== shipment.status) {
              const isDelivered = shipment.status === "delivered";
              const isNotDelivered = shipment.status === "not_delivered";

              const notification: RealtimeNotification = {
                id: `status-${shipment.shipment_id}-${Date.now()}`,
                type: "status_change",
                title: isDelivered
                  ? `📦 Entrega Confirmada`
                  : isNotDelivered
                  ? `⚠️ Entrega Não Realizada`
                  : `📍 Status Atualizado`,
                message: `Envio ${shipment.shipment_id}: ${getStatusLabel(shipment.status)}`,
                shipmentId: shipment.shipment_id,
                timestamp: new Date(),
                read: false,
                priority: getPriorityFromStatus(shipment.status),
              };
              addNotification(notification);

              if (isDelivered) {
                toast.success(notification.title, {
                  description: notification.message,
                  duration: 4000,
                });
              } else if (isNotDelivered) {
                toast.error(notification.title, {
                  description: notification.message,
                  duration: 5000,
                });
              } else {
                toast.info(notification.title, {
                  description: notification.message,
                  duration: 3000,
                });
              }
            }
          }
        )
        // Listen to driver assignments
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "driver_assignments",
            filter: `owner_user_id=eq.${userId}`,
          },
          (payload) => {
            const assignment = payload.new as any;
            const notification: RealtimeNotification = {
              id: `assignment-${assignment.id}`,
              type: "assignment",
              title: `🚚 Nova Atribuição`,
              message: `Envio ${assignment.shipment_id} atribuído a motorista`,
              shipmentId: assignment.shipment_id,
              timestamp: new Date(),
              read: false,
              priority: "medium",
            };
            addNotification(notification);
            toast.info(notification.title, {
              description: notification.message,
              duration: 3000,
            });
          }
        )
        .subscribe((status) => {
          setIsConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") {
            console.log("Realtime notifications connected");
          } else if (status === "CHANNEL_ERROR") {
            console.error("Realtime channel error");
          }
        });

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isConnected,
  };
}
