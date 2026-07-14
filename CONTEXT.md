# DueDateBuddy

DueDateBuddy tracks due dates and account access for people managing payment reminders.

## Language

**Password recovery**:
A user-initiated email flow that creates a temporary authenticated recovery session so the user can set a new password in the app.
_Avoid_: Forgot-password link, reset token flow

**Nama lengkap**:
The user's display name captured during signup and stored as auth profile metadata.
_Avoid_: Username, account name

**Inbox notifikasi**:
A bell-only screen that derives actionable notification cards from the user's current reminders instead of storing separate notification history.
_Avoid_: Notification tab, persisted notification log

**Perlu perhatian**:
A derived count of reminders that should be surfaced to the user now, such as overdue reminders or reminders due soon. Used by notification badges; it is not an unread-notification count.
_Avoid_: Unread count, notification history count
