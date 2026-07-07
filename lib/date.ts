import { format, formatDistanceToNow, isBefore, isSameMonth, parseISO, startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatDate(date: string | Date, fmt: string = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: id });
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function daysRemaining(date: string | Date): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isBefore(d, new Date());
}

export function isThisMonth(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isSameMonth(d, new Date());
}

export function getIndonesianMonthName(): string {
  return format(new Date(), 'MMMM', { locale: id });
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return `Terlewat ${Math.abs(days)} hari`;
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  return `${days} hari lagi`;
}
