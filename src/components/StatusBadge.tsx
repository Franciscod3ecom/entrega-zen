import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  substatus?: string | null;
}

export function StatusBadge({ status, substatus }: StatusBadgeProps) {
  const getColorClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-800';
      case 'in_transit':
      case 'ready_to_ship':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800';
      case 'not_delivered':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700';
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
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${getColorClasses(status)}`}>
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
