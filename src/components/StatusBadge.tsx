import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  substatus?: string | null;
}

export function StatusBadge({ status, substatus }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'default' as const;
      case 'in_transit':
      case 'ready_to_ship':
        return 'secondary' as const;
      case 'not_delivered':
      case 'cancelled':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'delivered': 'Entregue',
      'in_transit': 'Em trânsito',
      'ready_to_ship': 'Pronto para envio',
      'not_delivered': 'Não entregue',
      'cancelled': 'Cancelado',
      'pending': 'Pendente',
      'returned_to_sender': 'Devolvido',
    };
    return labels[status.toLowerCase()] || status;
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={getVariant(status)}>
        {getStatusLabel(status)}
      </Badge>
      {substatus && (
        <span className="text-xs text-muted-foreground">
          {substatus}
        </span>
      )}
    </div>
  );
}
