# Bottom Navigation Redesign Design

## Decision
Redesign the Expo Router tab bar as a safe-area docked floating bottom bar for light mode only.

## UI
- White floating bar with horizontal margins, 24–28px radius, soft shadow/elevation, no divider.
- Four equal-width tabs: Beranda, Pengingat, Aset, Pengaturan.
- Labels always visible, 12–13px Plus Jakarta Sans medium.
- Active tab uses a rounded teal-tint pill; icon and label use app teal.
- Inactive tabs use neutral gray, no background.
- Ionicons outline icons only; no new icon dependency.
- Minimum tap area 48×48, preferred 56×56.

## Badge
The Pengingat badge shows `perlu perhatian`, not unread notifications.
A reminder counts once when it is pending/overdue and due within 7 days or overdue by status/date.
Badge is hidden at 0 and displays `99+` above 99.

## Animation
Use React Native `Animated` only.
Animate active item opacity/scale over 200–250ms.
Skip a physically sliding pill; equal-width item fade/scale is enough and avoids layout measurement code.

## Component structure
- `components/navigation/BottomNavigation.tsx`
  - `BottomNavigation`
  - internal `NavigationItem`
- `features/reminders/attention.ts`
  - shared `getPerluPerhatianCount()` helper
- `app/(tabs)/_layout.tsx`
  - wires `tabBar={(props) => <BottomNavigation {...props} />}`
- `app/(tabs)/index.tsx`
  - reuses shared badge count for Home bell

## Validation
- `npm test -- attention`
- `npm run typecheck`
- Manual Expo check for safe area, tap targets, badge, and animation.
