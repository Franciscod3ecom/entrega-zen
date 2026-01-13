import { Bell, Check, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "@/components/NotificationItem";
import { useRealtimeNotifications, RealtimeNotification } from "@/hooks/useRealtimeNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isConnected,
  } = useRealtimeNotifications();

  const handleNotificationClick = (notification: RealtimeNotification) => {
    markAsRead(notification.id);
    // Navigate to operations page with the shipment
    navigate(`/operacoes?search=${notification.shipmentId}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notificações</h4>
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isConnected ? "text-success" : "text-destructive"
              )}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={markAllAsRead}
                title="Marcar todas como lidas"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearNotifications}
                title="Limpar notificações"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
              <p className="text-xs">Você será notificado em tempo real</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => navigate("/operacoes")}
              >
                Ver todas as operações
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
