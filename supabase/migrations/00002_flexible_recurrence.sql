-- Flexible recurrence rules. Keep legacy recurrence text for rollback/compatibility.

alter table public.reminders
  add column if not exists recurrence_rule jsonb;

update public.reminders
set recurrence_rule = case
  when recurrence = 'monthly' then jsonb_build_object(
    'version', 1,
    'enabled', true,
    'interval', 1,
    'unit', 'month',
    'startDate', to_char(due_date, 'YYYY-MM-DD'),
    'monthlyMode', 'dayOfMonth',
    'dayOfMonth', extract(day from due_date)::int,
    'end', jsonb_build_object('type', 'never')
  )
  when recurrence = 'yearly' then jsonb_build_object(
    'version', 1,
    'enabled', true,
    'interval', 1,
    'unit', 'year',
    'startDate', to_char(due_date, 'YYYY-MM-DD'),
    'end', jsonb_build_object('type', 'never')
  )
  else jsonb_build_object(
    'version', 1,
    'enabled', false
  )
end
where recurrence_rule is null;

alter table public.reminders
  alter column recurrence_rule set default jsonb_build_object('version', 1, 'enabled', false),
  alter column recurrence_rule set not null;

alter table public.reminders
  add constraint reminders_recurrence_rule_is_object
  check (jsonb_typeof(recurrence_rule) = 'object');

comment on column public.reminders.recurrence is
  'Deprecated legacy recurrence string. Use recurrence_rule jsonb.';

comment on column public.reminders.recurrence_rule is
  'Versioned flexible reminder recurrence rule. Version 1 is validated in application code.';
