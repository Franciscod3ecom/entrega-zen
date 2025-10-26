import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const BRT_TIMEZONE = 'America/Recife';

export function formatBRT(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  
  // Verifica se a data é válida
  if (isNaN(parsedDate.getTime())) return '-';
  
  const zonedDate = toZonedTime(parsedDate, BRT_TIMEZONE);
  return format(zonedDate, 'dd/MM/yyyy HH:mm') + ' BRT';
}

export function formatBRTDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(parsedDate.getTime())) return '-';
  
  const zonedDate = toZonedTime(parsedDate, BRT_TIMEZONE);
  return format(zonedDate, 'dd/MM/yyyy');
}
