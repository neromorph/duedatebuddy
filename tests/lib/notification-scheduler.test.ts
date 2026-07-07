import { computeTriggers, buildDigestBody, buildOverdueBody } from '../../lib/notification-scheduler';

describe('computeTriggers', () => {
  it('computes trigger dates from schedule and notification time', () => {
    const dueDate = new Date('2026-08-01T00:00:00');
    const schedule = [7, 3, 1];
    const triggers = computeTriggers(dueDate, schedule, '08:00');
    expect(triggers).toHaveLength(3);
    expect(triggers[0].date.getHours()).toBe(8);
    expect(triggers[0].date.getMinutes()).toBe(0);
    expect(triggers[0].type).toBe('reminder');
  });

  it('filters out past trigger dates', () => {
    const pastDate = new Date('2020-01-01T00:00:00');
    const schedule = [7, 3, 1];
    const triggers = computeTriggers(pastDate, schedule, '08:00');
    expect(triggers).toHaveLength(0);
  });

  it('handles empty schedule', () => {
    const dueDate = new Date('2026-08-01T00:00:00');
    const triggers = computeTriggers(dueDate, [], '08:00');
    expect(triggers).toHaveLength(0);
  });
});

describe('buildDigestBody', () => {
  it('builds a grouped notification body', () => {
    const reminders = [
      { title: 'Listrik', amount: 150000 },
      { title: 'Internet', amount: 350000 },
    ];
    const body = buildDigestBody(reminders);
    expect(body).toContain('2 pengingat hari ini');
    expect(body).toContain('Listrik');
    expect(body).toContain('Internet');
  });

  it('handles empty reminders list', () => {
    expect(buildDigestBody([])).toContain('0 pengingat hari ini');
  });

  it('handles reminder without amount', () => {
    const body = buildDigestBody([{ title: 'Test', amount: null }]);
    expect(body).toContain('Test');
    expect(body).not.toContain('Rp');
  });
});

describe('buildOverdueBody', () => {
  it('includes days overdue and amount', () => {
    const body = buildOverdueBody({ title: 'Listrik', amount: 150000, due_date: '2026-07-01' });
    expect(body).toContain('Terlewat!');
    expect(body).toContain('Listrik');
    expect(body).toContain('150.000');
  });

  it('works without amount', () => {
    const body = buildOverdueBody({ title: 'Test', amount: null, due_date: '2026-07-01' });
    expect(body).toContain('Terlewat! Test');
  });
});
