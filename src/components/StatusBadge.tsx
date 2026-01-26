import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  substatus?: string | null;
}

export function StatusBadge({ status, substatus }: StatusBadgeProps) {
  const getColorClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-success/20 text-success border-success/30';
      case 'in_transit':
      case 'ready_to_ship':
      case 'shipped':
      case 'out_for_delivery':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'not_delivered':
      case 'cancelled':
        return 'bg-danger/20 text-danger border-danger/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'delivered': 'Entregue',
      'in_transit': 'Em Trânsito',
      'ready_to_ship': 'Pronto p/ Envio',
      'shipped': 'Em Trânsito',
      'out_for_delivery': 'Saiu p/ Entrega',
      'not_delivered': 'Não Entregue',
      'cancelled': 'Cancelado',
      'pending': 'Pendente',
      'returned_to_sender': 'Devolvido',
      'handling': 'Em Preparação',
      'returned': 'Devolvido',
    };
    return labels[status.toLowerCase()] || status;
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        getColorClasses(status)
      )}>
        {getStatusLabel(status)}
      </span>
      {substatus && (
        <span className="text-xs text-muted-foreground">
          {substatus}
        </span>
      )}
    </div>
  );
}
