# DueDateBuddy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile app (Expo/RN) for tracking personal assets, bills, document expiry, and recurring due dates in Bahasa Indonesia.

**Architecture:** Expo Router file-based routing with Zustand for auth state, custom hooks per feature for Supabase queries, React Hook Form + Zod for form validation, and expo-notifications for local reminders. Single-user (no family groups), light mode only.

**Tech Stack:** Expo ~52 · React Native · TypeScript · Expo Router · Supabase Auth + Postgres · Zustand · React Hook Form + Zod · date-fns · expo-notifications · Plus Jakarta Sans

---

## Global Constraints

- All UI text in Bahasa Indonesia (not English).
- Light mode only — no dark mode.
- `@expo-google-fonts/plus-jakarta-sans` for typography.
- `StyleSheet.create` for all styles — no external CSS-in-JS, no Tailwind.
- Zustand for auth session only; custom hooks for data fetching.
- Supabase queries must filter by `auth.uid()` for RLS compliance.
- Every screen must handle loading, empty, and error states.
- `SafeAreaView` on every screen, `KeyboardAvoidingView` on form screens.
- Minimum touch target 48x48dp for all interactive elements.
- 8dp base spacing grid.

---

### Task 1: Project Scaffold & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `app.json`
- Create: `babel.config.js`
- Create: `.env.example`
- Update: `.gitignore`

**Interfaces:**
- Produces: Runnable Expo project scaffold with all dependencies declared

- [ ] **Step 1: Create package.json**

```json
{
  "name": "duedatebuddy",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "tsc": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-font": "~13.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-secure-store": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-linking": "~7.0.0",
    "expo-constants": "~17.0.0",
    "expo-dev-client": "~5.0.0",
    "react": "18.3.1",
    "react-native": "0.76.6",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-reanimated": "~3.16.1",
    "@react-navigation/bottom-tabs": "~7.2.0",
    "@react-navigation/native": "~7.0.0",
    "@expo/vector-icons": "^14.0.0",
    "@expo-google-fonts/plus-jakarta-sans": "^0.2.3",
    "@supabase/supabase-js": "^2.42.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "date-fns": "^3.6.0",
    "@react-native-community/datetimepicker": "8.0.1"
  },
  "devDependencies": {
    "typescript": "~5.3.0",
    "@types/react": "~18.3.0",
    "@tsconfig/react-native": "~3.0.0"
  },
  "private": true
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@tsconfig/react-native/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "types": ["react-native"],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "jsx": "react-jsx"
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 3: Create app.json**

```json
{
  "expo": {
    "name": "DueDateBuddy",
    "slug": "duedatebuddy",
    "version": "1.0.0",
    "scheme": "duedatebuddy",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#006874"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.duedatebuddy.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#006874"
      },
      "package": "com.duedatebuddy.app"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#006874" }]
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 4: Create babel.config.js**

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

- [ ] **Step 5: Create .env.example**

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 6: Update .gitignore**

Add: `node_modules/`, `.expo/`, `dist/`, `.env`

- [ ] **Step 7: Create directory structure**

```
mkdir -p app/(auth) app/(tabs)/(reminders) app/(tabs)/(assets)
mkdir -p components/ui
mkdir -p features/auth features/reminders features/assets
mkdir -p lib types supabase/migrations assets
```

- [ ] **Step 8: Create placeholder asset images**

Create minimal 1x1 PNG files for `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png`, `assets/notification-icon.png` (can be blank placeholders for development).

- [ ] **Step 9: Install dependencies**

```bash
npm install
npx expo install --fix
```

- [ ] **Step 10: Verify**

```bash
npx tsc --noEmit
```
Expected: No type errors (may show warnings about missing module declarations, which is fine initially).

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "chore: scaffold Expo project with dependencies"
```

---

### Task 2: Theme, Types & Core Libraries

**Files:**
- Create: `lib/theme.ts`
- Create: `types/index.ts`
- Create: `lib/supabase.ts`
- Create: `lib/date.ts`

**Interfaces:**
- Consumes: Task 1 (project scaffold)
- Produces: `COLORS`, `TYPOGRAPHY`, `SPACING`, `RADII` constants; TypeScript types for all DB entities; Supabase client; date utility functions

- [ ] **Step 1: Create lib/theme.ts**

Design system constants. Every visual token in one place.

```ts
import { TextStyle } from 'react-native';

export const COLORS = {
  primary: '#006874',
  onPrimary: '#FFFFFF',
  primaryContainer: '#97E4F2',
  surface: '#F8FAFA',
  surfaceContainer: '#ECEEEE',
  surfaceContainerHigh: '#E6E8E9',
  onSurface: '#191C1D',
  onSurfaceVariant: '#3F484A',
  outline: '#BEC8CA',
  statusCritical: '#BA1A1A',
  statusWarning: '#8F4E00',
  statusActive: '#2E6C00',
  statusNeutral: '#535F61',
} as const;

const fontFamily = 'PlusJakartaSans';

export const TYPOGRAPHY: Record<string, TextStyle> = {
  headline: { fontFamily, fontSize: 24, fontWeight: '700', lineHeight: 32 },
  title: { fontFamily, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  body: { fontFamily, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  label: { fontFamily, fontSize: 12, fontWeight: '500', lineHeight: 16 },
  amount: { fontFamily, fontSize: 16, fontWeight: '700', lineHeight: 24 },
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
} as const;

export const RADII = {
  sm: 4, md: 12, lg: 16, xl: 24, full: 9999,
} as const;
```

- [ ] **Step 2: Create types/index.ts**

```ts
export type ReminderCategory = 'bill' | 'vehicle' | 'property' | 'credit_card' | 'insurance' | 'subscription' | 'document' | 'other';
export type RecurrenceType = 'none' | 'monthly' | 'yearly';
export type ReminderStatus = 'pending' | 'paid' | 'overdue';
export type AssetCategory = 'property' | 'vehicle' | 'subscription' | 'utility' | 'insurance' | 'loan' | 'document' | 'custom';

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}

export interface AssetTemplate {
  id: string;
  name: string;
  category: AssetCategory;
  icon_name: string;
  default_fields: Record<string, unknown>[];
  is_system: boolean;
  created_at: string;
}

export interface Asset {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  category: AssetCategory;
  icon_name: string;
  description: string | null;
  custom_fields: Record<string, unknown>;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  asset_id: string | null;
  title: string;
  category: ReminderCategory;
  due_date: string;
  recurrence: RecurrenceType;
  amount: number | null;
  notes: string | null;
  remind_before_days: number[];
  status: ReminderStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<ReminderCategory, string> = {
  bill: 'Tagihan',
  vehicle: 'Kendaraan',
  property: 'Properti',
  credit_card: 'Kartu Kredit',
  insurance: 'Asuransi',
  subscription: 'Langganan',
  document: 'Dokumen',
  other: 'Lainnya',
};

export const CATEGORY_ICONS: Record<ReminderCategory, string> = {
  bill: 'receipt',
  vehicle: 'car',
  property: 'home',
  credit_card: 'card',
  insurance: 'shield',
  subscription: 'refresh',
  document: 'document',
  other: 'ellipse',
};
```

- [ ] **Step 3: Create lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 4: Create lib/date.ts**

```ts
import { format, formatDistanceToNow, isPast, isThisMonth as isThisMonthFns, parseISO, differenceInDays, addMonths, addYears } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatDate(date: string | Date, fmt = 'dd MMMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: id });
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function daysRemaining(date: string): number {
  return differenceInDays(parseISO(date), new Date());
}

export function isOverdue(date: string): boolean {
  return isPast(parseISO(date));
}

export function isThisMonth(date: string): boolean {
  return isThisMonthFns(parseISO(date));
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return 'Terlewat';
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  return `H-${days}`;
}

export function computeNextRecurrence(dueDate: string, recurrence: string): string | null {
  const d = parseISO(dueDate);
  if (recurrence === 'monthly') return format(addMonths(d, 1), 'yyyy-MM-dd');
  if (recurrence === 'yearly') return format(addYears(d, 1), 'yyyy-MM-dd');
  return null;
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add theme, types, supabase client, date utils"
```

---

### Task 3: UI Component Library

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Select.tsx`
- Create: `components/ui/DatePicker.tsx`
- Create: `components/ui/AmountInput.tsx`
- Create: `components/ui/FAB.tsx`
- Create: `components/ui/ScreenHeader.tsx`
- Create: `components/ui/LoadingState.tsx`
- Create: `components/ui/EmptyState.tsx`
- Create: `components/ui/ErrorState.tsx`

**Interfaces:**
- Consumes: Task 2 (`COLORS`, `TYPOGRAPHY`, `SPACING`, `RADII`)
- Produces: Reusable UI primitives used by every screen

- [ ] **Step 1: Create Button.tsx**

Three variants: `primary`, `secondary`, `outline`. All have 48dp minHeight.

```tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: object;
}

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? COLORS.onPrimary : COLORS.primary} />
      ) : (
        <Text style={[styles.text, variant === 'primary' ? styles.textPrimary : styles.textSecondary]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  primary: { backgroundColor: COLORS.primary },
  secondary: { backgroundColor: COLORS.primaryContainer },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  disabled: { opacity: 0.5 },
  text: { ...TYPOGRAPHY.title },
  textPrimary: { color: COLORS.onPrimary },
  textSecondary: { color: COLORS.primary },
});
```

- [ ] **Step 2: Create Card.tsx**

```tsx
import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { COLORS, SPACING, RADII } from '@/lib/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export default function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADII.md,
    padding: SPACING.md,
  },
});
```

- [ ] **Step 3: Create Badge.tsx**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, RADII } from '@/lib/theme';

type BadgeVariant = 'critical' | 'warning' | 'active' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const BADGE_COLORS: Record<BadgeVariant, string> = {
  critical: COLORS.statusCritical,
  warning: COLORS.statusWarning,
  active: COLORS.statusActive,
  neutral: COLORS.statusNeutral,
};

export default function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const color = BADGE_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADII.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { ...TYPOGRAPHY.label, fontWeight: '600' },
});
```

- [ ] **Step 4: Create Input.tsx**

Outlined text field with label, error state, 2px primary border on focus.

```tsx
import React, { useState } from 'react';
import { View, TextInput as RNInput, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@/lib/theme';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  editable?: boolean;
}

export default function Input({ label, value, onChangeText, error, placeholder, secureTextEntry, multiline, keyboardType, editable }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <RNInput
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.onSurfaceVariant}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, color: COLORS.onSurface, marginBottom: SPACING.xs },
  input: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    padding: SPACING.sm + 4,
    color: COLORS.onSurface,
    minHeight: 48,
  },
  inputFocused: { borderWidth: 2, borderColor: COLORS.primary },
  inputError: { borderColor: COLORS.statusCritical },
  error: { ...TYPOGRAPHY.label, color: COLORS.statusCritical, marginTop: SPACING.xs },
});
```

- [ ] **Step 5: Create Select.tsx**

Modal-based picker for enums (categories, recurrence). Uses React Native Modal + FlatList.

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@/lib/theme';

interface SelectOption { label: string; value: string }

interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onSelect: (value: string) => void;
  error?: string;
}

export default function Select({ label, options, value, onSelect, error }: SelectProps) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || 'Pilih...';
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.trigger, error && styles.triggerError]} onPress={() => setVisible(true)}>
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{selectedLabel}</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item.value === value && styles.optionSelected]}
                onPress={() => { onSelect(item.value); setVisible(false); }}
              >
                <Text style={[styles.optionText, item.value === value && styles.optionTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, color: COLORS.onSurface, marginBottom: SPACING.xs },
  trigger: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    padding: SPACING.sm + 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  triggerError: { borderColor: COLORS.statusCritical },
  triggerText: { color: COLORS.onSurface },
  placeholder: { color: COLORS.onSurfaceVariant },
  overlay: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    maxHeight: 400,
    padding: SPACING.md,
  },
  sheetTitle: { ...TYPOGRAPHY.title, marginBottom: SPACING.md },
  option: { paddingVertical: SPACING.sm + 4, paddingHorizontal: SPACING.md },
  optionSelected: { backgroundColor: COLORS.primaryContainer, borderRadius: RADII.sm },
  optionText: { ...TYPOGRAPHY.body, color: COLORS.onSurface },
  optionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  error: { ...TYPOGRAPHY.label, color: COLORS.statusCritical, marginTop: SPACING.xs },
});
```

- [ ] **Step 6: Create DatePicker.tsx**

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@/lib/theme';
import { formatDate } from '@/lib/date';

interface DatePickerProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
}

export default function DatePicker({ label, value, onChange, error }: DatePickerProps) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.trigger, error && styles.triggerError]} onPress={() => setShow(true)}>
        <Text style={styles.triggerText}>{formatDate(value)}</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => { setShow(false); if (date) onChange(date); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, color: COLORS.onSurface, marginBottom: SPACING.xs },
  trigger: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    padding: SPACING.sm + 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  triggerError: { borderColor: COLORS.statusCritical },
  triggerText: { color: COLORS.onSurface },
  error: { ...TYPOGRAPHY.label, color: COLORS.statusCritical, marginTop: SPACING.xs },
});
```

- [ ] **Step 7: Create AmountInput.tsx**

```tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@/lib/theme';

interface AmountInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export default function AmountInput({ label, value, onChangeText, error }: AmountInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        <Text style={styles.prefix}>Rp</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={COLORS.onSurfaceVariant}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, color: COLORS.onSurface, marginBottom: SPACING.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: RADII.sm,
    minHeight: 48,
  },
  inputRowError: { borderColor: COLORS.statusCritical },
  prefix: { ...TYPOGRAPHY.title, color: COLORS.onSurfaceVariant, paddingLeft: SPACING.sm + 4 },
  input: { ...TYPOGRAPHY.title, flex: 1, padding: SPACING.sm + 4, color: COLORS.onSurface },
  error: { ...TYPOGRAPHY.label, color: COLORS.statusCritical, marginTop: SPACING.xs },
});
```

- [ ] **Step 8: Create FAB.tsx**

```tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '@/lib/theme';

interface FABProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export default function FAB({ icon = 'add', onPress }: FABProps) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={28} color={COLORS.onPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: SPACING.lg + 16,
    right: SPACING.md,
    width: 56,
    height: 56,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
```

- [ ] **Step 9: Create ScreenHeader.tsx**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/theme';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export default function ScreenHeader({ title, showBack = true, rightAction }: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    backgroundColor: COLORS.surface,
  },
  left: { width: 40 },
  back: { padding: SPACING.xs },
  title: { ...TYPOGRAPHY.headline, flex: 1, textAlign: 'center' },
  right: { width: 40 },
});
```

- [ ] **Step 10: Create LoadingState.tsx, EmptyState.tsx, ErrorState.tsx**

```tsx
// LoadingState.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/theme';

export default function LoadingState({ message = 'Memuat...' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  text: { ...TYPOGRAPHY.body, color: COLORS.onSurfaceVariant, marginTop: SPACING.md },
});
```

```tsx
// EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/theme';
import Button from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  cta?: string;
  onCtaPress?: () => void;
}

export default function EmptyState({ icon = 'folder-open', title, subtitle, cta, onCtaPress }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={COLORS.surfaceContainerHigh} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {cta && onCtaPress && <Button title={cta} onPress={onCtaPress} style={styles.cta} />}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  title: { ...TYPOGRAPHY.title, color: COLORS.onSurface, marginTop: SPACING.md },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.xs },
  cta: { marginTop: SPACING.lg },
});
```

```tsx
// ErrorState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/theme';
import Button from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={64} color={COLORS.statusCritical} />
      <Text style={styles.text}>{message}</Text>
      {onRetry && <Button title="Coba Lagi" onPress={onRetry} variant="outline" style={styles.cta} />}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  text: { ...TYPOGRAPHY.body, color: COLORS.onSurface, textAlign: 'center', marginTop: SPACING.md },
  cta: { marginTop: SPACING.lg },
});
```

- [ ] **Step 11: Verify**

```bash
npx tsc --noEmit
```
Expected: No type errors.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "feat: add reusable UI components"
```

---

### Task 4: Authentication Feature

**Files:**
- Create: `features/auth/useAuth.ts`
- Create: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`
- Create: `app/(auth)/register.tsx`

**Interfaces:**
- Consumes: Tasks 2-3 (`supabase.ts`, UI components)
- Produces: Auth state (Zustand); Login + Register screens; Auth guard root layout

- [ ] **Step 1: Create useAuth.ts** (Zustand store)

```ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,

  initialize: async () => {
    const stored = await SecureStore.getItemAsync('session');
    if (stored) {
      const session = JSON.parse(stored) as Session;
      set({ session, user: session.user, isLoading: false });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, isLoading: false });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) await SecureStore.setItemAsync('session', JSON.stringify(data.session));
    set({ session: data.session, user: data.session?.user ?? null });
    return {};
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) return { error: error.message };
    if (data.session) await SecureStore.setItemAsync('session', JSON.stringify(data.session));
    set({ session: data.session, user: data.session?.user ?? null });
    return {};
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync('session');
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
```

- [ ] **Step 2: Create app/_layout.tsx** (root layout — auth guard)

```tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/useAuth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
  });
  const { initialize, session, isLoading } = useAuth();

  useEffect(() => { initialize(); }, []);
  useEffect(() => { if (fontsLoaded && !isLoading) SplashScreen.hideAsync(); }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Create app/(auth)/_layout.tsx**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 4: Create app/(auth)/login.tsx**

Login screen with teal header area, email/password form, link to register. Uses React Hook Form + Zod.

```tsx
import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/theme';
import { useAuth } from '@/features/auth/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({ email: z.string().email('Email tidak valid'), password: z.string().min(6, 'Minimal 6 karakter') });
type Form = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const onSubmit = async (data: Form) => {
    setLoading(true); setError('');
    const result = await signIn(data.email, data.password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.appName}>DueDateBuddy</Text>
        <Text style={styles.tagline}>Kelola tenggat waktumu dengan mudah</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.title}>Masuk</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <Controller control={control} name="email" render={({ field }) => (
          <Input label="Email" value={field.value} onChangeText={field.onChange} error={errors.email?.message} keyboardType="email-address" />
        )} />
        <Controller control={control} name="password" render={({ field }) => (
          <Input label="Password" value={field.value} onChangeText={field.onChange} error={errors.password?.message} secureTextEntry />
        )} />
        <Button title="Masuk" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submit} />
        <Button title="Belum punya akun? Daftar" onPress={() => router.push('/register')} variant="text" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { backgroundColor: COLORS.primary, paddingTop: 80, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.md, alignItems: 'center' },
  appName: { fontFamily: 'PlusJakartaSans', fontSize: 28, fontWeight: '700', color: COLORS.onPrimary },
  tagline: { ...TYPOGRAPHY.body, color: COLORS.onPrimary, opacity: 0.8, marginTop: SPACING.xs },
  form: { flex: 1, padding: SPACING.lg },
  title: { ...TYPOGRAPHY.headline, color: COLORS.onSurface, marginBottom: SPACING.md },
  error: { ...TYPOGRAPHY.label, color: COLORS.statusCritical, marginBottom: SPACING.sm, textAlign: 'center' },
  submit: { marginTop: SPACING.sm },
});
```

- [ ] **Step 5: Create app/(auth)/register.tsx**

Same visual pattern as login, but adds `full_name` field and calls `signUp`.

```tsx
// Same structure as login with additional full_name field
// Uses: Controller for full_name, email, password fields
// On submit: calls signUp(data.email, data.password, data.full_name)
// Link to login page instead of register
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add auth with login and register screens"
```

---

### Task 5: Tab Navigation & Dashboard

**Files:**
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx` (Dashboard)

**Interfaces:**
- Consumes: Tasks 2-4 (auth, UI components, theme types)
- Produces: Bottom tab navigator with 4 tabs; Dashboard screen with summary cards + upcoming reminders

- [ ] **Step 1: Create app/(tabs)/_layout.tsx**

```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.onSurfaceVariant,
      tabBarLabelStyle: { ...TYPOGRAPHY.label, fontSize: 11 },
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.surfaceContainer,
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
      },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="(reminders)" options={{ title: 'Pengingat', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="(assets)" options={{ title: 'Aset', tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size} color={color} /> }} />
      <Tabs.Screen name="pengaturan" options={{ title: 'Pengaturan', tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create Dashboard screen (app/(tabs)/index.tsx)**

Dashboard with 2x2 summary grid + upcoming reminders list + FAB.

Key data fetching pattern (used by all feature hooks):

```ts
// Inside the component:
// 1. Fetch reminders with useEffect
// 2. Compute summary metrics from fetched data
// 3. Filter and sort for upcoming section
```

Summary cards:
- "Akan Jatuh Tempo" — count of reminders with due_date ≤7 days
- "Terlewat" — count of overdue reminders (status=overdue or past due + pending)
- "Bulan Ini" — count of reminders with due_date this month
- "Estimasi" — sum of amounts for this month's reminders

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add tab navigation and dashboard"
```

---

### Task 6: Reminder Feature (CRUD)

**Files:**
- Create: `features/reminders/useReminders.ts`
- Create: `features/reminders/ReminderForm.tsx`
- Create: `features/reminders/ReminderCard.tsx`
- Create: `app/(tabs)/(reminders)/_layout.tsx`
- Create: `app/(tabs)/(reminders)/index.tsx`
- Create: `app/(tabs)/(reminders)/tambah.tsx`
- Create: `app/(tabs)/(reminders)/[id].tsx`
- Create: `app/(tabs)/(reminders)/[id]/edit.tsx`

**Interfaces:**
- Consumes: Tasks 2-5 (supabase, UI components, types)
- Produces: Full reminder CRUD with list, detail, create, edit, mark as paid

- [ ] **Step 1: Create useReminders.ts**

Hook with `fetchReminders`, `createReminder`, `updateReminder`, `deleteReminder`, `markAsPaid`. Each function calls `supabase.from('reminders')` with proper RLS (`eq('user_id', auth.uid())`).

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Reminder } from '@/types';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from('reminders').select('*').order('due_date', { ascending: true });
    if (error) setError(error.message);
    else setReminders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReminders(); }, []);

  const createReminder = async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('reminders').insert(reminder);
    if (!error) fetchReminders();
    return { error: error?.message };
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const { error } = await supabase.from('reminders').update(updates).eq('id', id);
    if (!error) fetchReminders();
    return { error: error?.message };
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (!error) fetchReminders();
    return { error: error?.message };
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase.from('reminders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) fetchReminders();
    return { error: error?.message };
  };

  return { reminders, loading, error, fetchReminders, createReminder, updateReminder, deleteReminder, markAsPaid };
}
```

- [ ] **Step 2: Create ReminderForm.tsx**

Reusable form used by both tambah and edit screens. React Hook Form + Zod.

Fields: title (TextInput), category (Select with CATEGORY_LABELS), due_date (DatePicker), recurrence (Select: none/monthly/yearly), amount (AmountInput optional), notes (TextInput multiline optional), remind_before_days (row of toggleable chip buttons: H-7, H-3, H-1, H-0), asset_id (Select from user's assets optional).

Zod schema:
```ts
const reminderSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  category: z.enum(['bill','vehicle','property','credit_card','insurance','subscription','document','other']),
  due_date: z.date({ required_error: 'Tanggal wajib diisi' }),
  recurrence: z.enum(['none','monthly','yearly']),
  amount: z.string().optional(),
  notes: z.string().optional(),
  remind_before_days: z.array(z.number()).default([7,3,1,0]),
  asset_id: z.string().optional(),
});
```

- [ ] **Step 3: Create ReminderCard.tsx**

Card component showing: title, category icon, due_date in Indonesian format, days remaining badge, amount (if exists), status badge.

- [ ] **Step 4: Create stack layout and list screen**

`(reminders)/_layout.tsx`: Stack navigator with screen options.
`(reminders)/index.tsx`: FlatList with horizontal filter tabs (Semua/Aktif/Terbayar/Terlewat). Each tab filters reminders by status. Pull-to-refresh. EmptyState when no reminders.

Filter logic:
- Semua: all reminders
- Aktif: status === 'pending' && !isOverdue
- Terbayar: status === 'paid'
- Terlewat: status === 'overdue' || (status === 'pending' && isOverdue)

- [ ] **Step 5: Create tambah.tsx**

Uses ReminderForm. On submit → calls createReminder → schedules notification → navigates back.

- [ ] **Step 6: Create [id].tsx (detail)**

Shows all reminder fields. Action buttons: Tandai Dibayar (calls markAsPaid, schedules next recurrence if applicable), Edit, Hapus (with confirmation Alert).

- [ ] **Step 7: Create [id]/edit.tsx**

Uses ReminderForm pre-filled with existing reminder data.

- [ ] **Step 8: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: add reminder CRUD screens"
```

---

### Task 7: Asset Feature (CRUD)

**Files:**
- Create: `features/assets/useAssets.ts`
- Create: `features/assets/AssetForm.tsx`
- Create: `features/assets/TemplatePicker.tsx`
- Create: `features/assets/AssetCard.tsx`
- Create: `app/(tabs)/(assets)/_layout.tsx`
- Create: `app/(tabs)/(assets)/index.tsx`
- Create: `app/(tabs)/(assets)/tambah.tsx`
- Create: `app/(tabs)/(assets)/[id].tsx`
- Create: `app/(tabs)/(assets)/[id]/edit.tsx`

**Interfaces:**
- Consumes: Tasks 2-5 (supabase, UI components, types)
- Produces: Full asset CRUD with template picker, list grouped by category, detail with related reminders

- [ ] **Step 1: Create useAssets.ts**

Same pattern as useReminders. `fetchAssets`, `fetchTemplates`, `createAsset`, `updateAsset`, `archiveAsset`.

- [ ] **Step 2: Create AssetForm.tsx**

Dynamic form that shows template fields (`default_fields`) when a template is selected, or simple name + category for custom assets.

- [ ] **Step 3: Create TemplatePicker.tsx**

Grid of 8 template cards (Rumah, Kendaraan Roda 4, Kendaraan Roda 2, Internet/ISP, Listrik/PLN, Asuransi Kendaraan, KPR/Cicilan, Custom). Each shows icon + name. Selecting one sets the template for AssetForm.

- [ ] **Step 4: Create AssetCard.tsx**

Card with asset icon, name, category badge, and (if available) next reminder due date from linked reminders.

- [ ] **Step 5: Create stack layout, list, detail, tambah, edit screens**

`(assets)/_layout.tsx`: Stack navigator.
`(assets)/index.tsx`: Assets grouped by category. Pull-to-refresh. EmptyState.
`(assets)/tambah.tsx`: TemplatePicker first, then AssetForm.
`(assets)/[id].tsx`: Detail with asset fields + related reminders list.
`(assets)/[id]/edit.tsx`: AssetForm pre-filled.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add asset CRUD with template picker"
```

---

### Task 8: Settings Screen

**Files:**
- Create: `app/(tabs)/pengaturan.tsx`

**Interfaces:**
- Consumes: Tasks 2-5 (auth, theme)

- [ ] **Step 1: Create pengaturan.tsx**

```tsx
// Shows:
// - User email from auth session
// - User full_name from profiles table
// - Placeholder sections for Notifikasi and Tampilan
// - Logout button (red, with Alert confirmation)
//
// Layout: ScrollView with Card-based sections
// Profile section: avatar circle with initials + name + email
// Notifications section: toggle placeholder
// About section: app version
// Logout: destructive button at bottom
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add settings screen with profile and logout"
```

---

### Task 9: Local Notifications

**Files:**
- Create: `lib/notifications.ts`
- Modify: `app/_layout.tsx` (initialize notifications)
- Modify: `features/reminders/useReminders.ts` (integrate notifications on create/update/mark paid)

**Interfaces:**
- Consumes: Task 2 (date utilities), reminder CRUD
- Produces: Notification scheduling and cancellation helpers

- [ ] **Step 1: Create lib/notifications.ts**

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { parseISO, subDays } from 'date-fns';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pengingat',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return true;
}

export async function scheduleReminderNotification(reminder: { id: string; title: string; due_date: string; remind_before_days: number[] }): Promise<void> {
  await cancelReminderNotifications(reminder.id);
  const dueDate = parseISO(reminder.due_date);
  for (const daysBefore of reminder.remind_before_days) {
    const triggerDate = subDays(dueDate, daysBefore);
    triggerDate.setHours(8, 0, 0, 0);
    if (triggerDate <= new Date()) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Pengingat', body: reminder.title, data: { reminderId: reminder.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  }
}

export async function cancelReminderNotifications(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter(n => n.content.data?.reminderId === reminderId).map(n => n.identifier);
  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

- [ ] **Step 2: Initialize permissions in app/_layout.tsx**

Add `requestNotificationPermissions()` call after auth initialization.

- [ ] **Step 3: Integrate with reminder CRUD**

In `useReminders.ts`:
- `createReminder` → call `scheduleReminderNotification` after insert success
- `updateReminder` → call `cancelReminderNotifications` then `scheduleReminderNotification`
- `markAsPaid` → call `cancelReminderNotifications`, then if recurring (`monthly`/`yearly`), compute next due date and create new reminder + schedule

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add local notifications for reminders"
```

---

### Task 10: Supabase Migration

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql`

**Interfaces:**
- Consumes: Task 1 (project scaffold)
- Produces: Complete DDL with RLS policies, triggers, and seed data

- [ ] **Step 1: Create migration file**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (mirrors auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- Asset templates (seeded, system-managed)
create table asset_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  icon_name text not null,
  default_fields jsonb not null default '[]',
  is_system boolean default true,
  created_at timestamptz default now()
);

-- Assets
create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid references asset_templates on delete set null,
  name text not null,
  category text not null,
  icon_name text not null,
  description text,
  custom_fields jsonb default '{}',
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reminders
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  asset_id uuid references assets on delete set null,
  title text not null,
  category text not null,
  due_date date not null,
  recurrence text not null default 'none',
  amount numeric,
  notes text,
  remind_before_days int[] default array[7,3,1,0],
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_status check (status in ('pending', 'paid', 'overdue'))
);

-- Indexes
create index idx_assets_user_id on assets(user_id);
create index idx_reminders_user_id on reminders(user_id);
create index idx_reminders_asset_id on reminders(asset_id);
create index idx_reminders_due_date on reminders(due_date);

-- RLS: Enable row-level security
alter table profiles enable row level security;
alter table asset_templates enable row level security;
alter table assets enable row level security;
alter table reminders enable row level security;

-- RLS: Profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- RLS: Asset templates (public read-only)
create policy "Anyone can view templates" on asset_templates for select using (true);

-- RLS: Assets
create policy "Users can view own assets" on assets for select using (auth.uid() = user_id);
create policy "Users can insert own assets" on assets for insert with check (auth.uid() = user_id);
create policy "Users can update own assets" on assets for update using (auth.uid() = user_id);
create policy "Users can delete own assets" on assets for delete using (auth.uid() = user_id);

-- RLS: Reminders
create policy "Users can view own reminders" on reminders for select using (auth.uid() = user_id);
create policy "Users can insert own reminders" on reminders for insert with check (auth.uid() = user_id);
create policy "Users can update own reminders" on reminders for update using (auth.uid() = user_id);
create policy "Users can delete own reminders" on reminders for delete using (auth.uid() = user_id);

-- Trigger: auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Seed asset templates
insert into asset_templates (name, category, icon_name, default_fields) values
  ('Rumah', 'property', 'home', '[{"label": "Alamat", "type": "text", "required": true}, {"label": "No Sertifikat", "type": "text", "required": false}, {"label": "No IMB", "type": "text", "required": false}]'),
  ('Kendaraan Roda 4', 'vehicle', 'car', '[{"label": "Plat Nomor", "type": "text", "required": true}, {"label": "Merek", "type": "text", "required": true}, {"label": "Model", "type": "text", "required": true}, {"label": "Tahun", "type": "text", "required": false}]'),
  ('Kendaraan Roda 2', 'vehicle', 'motorcycle', '[{"label": "Plat Nomor", "type": "text", "required": true}, {"label": "Merek", "type": "text", "required": true}, {"label": "Model", "type": "text", "required": true}, {"label": "Tahun", "type": "text", "required": false}]'),
  ('Internet / ISP', 'subscription', 'wifi', '[{"label": "Penyedia", "type": "text", "required": true}, {"label": "Paket", "type": "text", "required": true}, {"label": "No Pelanggan", "type": "text", "required": false}]'),
  ('Listrik (PLN)', 'utility', 'flash', '[{"label": "No Pelanggan", "type": "text", "required": true}, {"label": "Daya", "type": "text", "required": false}]'),
  ('Asuransi Kendaraan', 'insurance', 'shield', '[{"label": "No Polis", "type": "text", "required": true}, {"label": "Penyedia", "type": "text", "required": true}]'),
  ('KPR / Cicilan', 'loan', 'credit-card', '[{"label": "Bank", "type": "text", "required": true}, {"label": "No Rekening", "type": "text", "required": true}, {"label": "Sisa Cicilan", "type": "text", "required": false}]'),
  ('Custom', 'custom', 'file-text', '[]');
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add supabase migration with RLS and seed data"
```

---

### Task 11: Final Integration & Type Check

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```
Fix any remaining type errors.

- [ ] **Step 2: Verify all imports resolve**

Check that all `@/` path aliases, component imports, and module imports resolve correctly.

- [ ] **Step 3: Create .env from .env.example**

Copy `.env.example` to `.env` and fill in the real Supabase credentials.

- [ ] **Step 4: Verify app runs**

```bash
npx expo start
```
The dev server should start without errors. The app should show the login screen in the Expo Go or dev client.

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: final integration fixes"
```

---

## Spec Coverage

| Spec Section | Covered By |
|---|---|
| Data Model (SQL) | Task 10 |
| Navigation & Screen Map | Tasks 4-8 |
| UI Design System | Task 2 (theme), Task 3 (components) |
| Auth Flow | Task 4 |
| Dashboard | Task 5 |
| Reminder CRUD | Task 6 |
| Asset CRUD (with templates) | Task 7 |
| Settings | Task 8 |
| Notifications | Task 9 |
| RLS Policies | Task 10 |

## Setup Instructions

1. Copy `.env.example` to `.env` and fill in Supabase URL and anon key
2. Run `npm install`
3. Run the migration SQL in `supabase/migrations/00001_initial_schema.sql` in your Supabase SQL editor
4. Run `npx expo start` to start the dev server
5. Scan QR code with Expo Go or run on simulator/emulator

## Known Gaps (Not in MVP)

- Push notifications (server-side) — notification code structured for future Edge Functions
- Dark mode — ui-mocks include dark mode variants, but MVP is light-only per spec
- File attachments (Supabase Storage)
- Biometric lock
- Calendar view
- Multi-user / family groups
