import { z } from 'zod';
import { RECURRENCE_VERSION, ReminderRecurrence } from './types';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const recurrenceEndSchema = z.union([
  z.object({ type: z.literal('never') }),
  z.object({ type: z.literal('date'), until: dateString }),
  z.object({ type: z.literal('count'), occurrences: z.number().int().min(1) }),
]);

const disabledSchema = z.object({
  version: z.literal(RECURRENCE_VERSION),
  enabled: z.literal(false),
});

const enabledSchema = z
  .object({
    version: z.literal(RECURRENCE_VERSION),
    enabled: z.literal(true),
    interval: z.number().int().min(1),
    unit: z.enum(['day', 'week', 'month', 'year']),
    startDate: dateString,
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    monthlyMode: z.enum(['dayOfMonth', 'weekday']).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    weekOfMonth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(-1)]).optional(),
    weekday: z.number().int().min(0).max(6).optional(),
    end: recurrenceEndSchema,
  })
  .superRefine((rule, ctx) => {
    if (rule.unit === 'month') {
      if (!rule.monthlyMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['monthlyMode'],
          message: 'monthlyMode is required for monthly recurrence',
        });
      }
      if (rule.monthlyMode === 'dayOfMonth' && !rule.dayOfMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dayOfMonth'],
          message: 'dayOfMonth is required for dayOfMonth mode',
        });
      }
      if (rule.monthlyMode === 'weekday' && (rule.weekOfMonth == null || rule.weekday == null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weekOfMonth'],
          message: 'weekOfMonth and weekday are required for weekday mode',
        });
      }
    }
  });

export const reminderRecurrenceSchema = z.union([disabledSchema, enabledSchema]);

export function parseRecurrenceRule(value: unknown): ReminderRecurrence {
  return reminderRecurrenceSchema.parse(value);
}
