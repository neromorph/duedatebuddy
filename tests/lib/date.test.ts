import {
  formatCurrency,
  formatDate,
  formatDaysRemaining,
  getIndonesianMonthName,
  isOverdue,
  isThisMonth,
} from '../../lib/date';

describe('date and currency formatting', () => {
  const realDate = Date;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
    global.Date = realDate;
  });

  it('formats due dates in Indonesian', () => {
    expect(formatDate('2026-07-10')).toBe('10 Jul 2026');
  });

  it('formats nullable rupiah amounts for display', () => {
    expect(formatCurrency(150000)).toMatch(/^Rp\s?150\.000$/);
    expect(formatCurrency(null)).toBe('-');
  });

  it('labels remaining days for reminder cards', () => {
    expect(formatDaysRemaining(-2)).toBe('Terlewat 2 hari');
    expect(formatDaysRemaining(0)).toBe('Hari ini');
    expect(formatDaysRemaining(1)).toBe('Besok');
    expect(formatDaysRemaining(3)).toBe('3 hari lagi');
  });

  it('identifies overdue dates and current-month dates', () => {
    expect(isOverdue('2026-07-07')).toBe(true);
    expect(isOverdue('2026-07-09')).toBe(false);
    expect(isThisMonth('2026-07-31')).toBe(true);
    expect(isThisMonth('2026-08-01')).toBe(false);
  });

  it('returns current Indonesian month name', () => {
    expect(getIndonesianMonthName()).toBe('Juli');
  });
});
