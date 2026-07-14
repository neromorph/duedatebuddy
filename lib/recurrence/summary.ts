import { getDay } from 'date-fns';
import { parseLocalDate } from './normalize';
import { ReminderRecurrence } from './types';

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ORDINALS: Record<number, string> = {
  1: 'pertama',
  2: 'kedua',
  3: 'ketiga',
  4: 'keempat',
  [-1]: 'terakhir',
};
const UNITS = { day: 'Hari', week: 'Minggu', month: 'Bulan', year: 'Tahun' } as const;

function joinIndonesian(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, dan ${items[items.length - 1]}`;
}

function everyUnit(rule: Extract<ReminderRecurrence, { enabled: true }>): string {
  return rule.interval === 1
    ? `Setiap ${UNITS[rule.unit]}`
    : `Setiap ${rule.interval} ${UNITS[rule.unit]}`;
}

export function summarizeRecurrence(rule: ReminderRecurrence, dueDate: string): string {
  if (!rule.enabled) return 'Tidak Berulang';

  if (rule.unit === 'week' && rule.daysOfWeek && rule.daysOfWeek.length > 1) {
    const days = joinIndonesian(
      rule.daysOfWeek
        .slice()
        .sort((a, b) => a - b)
        .map((day) => WEEKDAYS[day]),
    );
    return rule.interval === 1
      ? `${days} setiap minggu`
      : `${days} setiap ${rule.interval} minggu`;
  }

  if (rule.unit === 'month') {
    if (rule.monthlyMode === 'dayOfMonth') {
      if (rule.interval > 1) return everyUnit(rule);
      return `Tanggal ${rule.dayOfMonth} setiap bulan`;
    }

    if (rule.monthlyMode === 'weekday') {
      const weekday = WEEKDAYS[rule.weekday ?? getDay(parseLocalDate(dueDate))];
      const ordinal = ORDINALS[rule.weekOfMonth ?? 1];
      if (rule.interval === 1) return `${weekday} ${ordinal} setiap bulan`;
      return `${weekday} ${ordinal} setiap ${rule.interval} bulan`;
    }
  }

  return everyUnit(rule);
}
