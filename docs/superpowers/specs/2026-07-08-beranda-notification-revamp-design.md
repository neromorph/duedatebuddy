# Beranda and Notification Inbox Revamp

## Goal

Revamp Beranda and the bell-only notification page to follow the provided Android HTML mock while keeping the implementation backed by current reminder data.

## Decisions

- Notification inbox is opened from the Beranda bell only; it is not a bottom tab.
- Inbox cards are derived from current reminders. No persisted notification history, read state, delete action, or notification table.
- Beranda uses only the essential mock sections: header, bell, main action card, summary, upcoming timeline, and FAB.
- Do not show the mock's local-mode/sync banner because this app currently reads Supabase data.
- Main action card shows the single most urgent pending/overdue reminder by due date.
- The main action button opens reminder detail instead of directly marking paid.

## Screens

### Beranda

- Shows greeting with profile name fallback from auth metadata/email.
- Shows today's date.
- Bell button opens `/notifications` and displays a badge count for pending/overdue reminders due within 7 days.
- Hero card shows the most urgent reminder, amount, due label, category, and a detail action.
- Summary tiles show today, this week, overdue, and this month counts/totals.
- Upcoming timeline lists pending reminders ordered by due date.

### Notification Inbox

- Uses a stack screen at `/notifications`, hidden from tabs.
- Fetches reminders with the current user and derives notice cards.
- Filters: all, urgent, today.
- Each card opens the reminder detail.
- Empty state explains that urgent reminder notices will appear there.

## Validation

- `npm run typecheck`
