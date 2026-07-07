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
};

const fontFamily = 'PlusJakartaSans';

export const TYPOGRAPHY: Record<string, TextStyle> = {
  headline: { fontFamily, fontSize: 24, fontWeight: '700', lineHeight: 32 },
  title: { fontFamily, fontSize: 16, fontWeight: '600', lineHeight: 24 },
  body: { fontFamily, fontSize: 14, fontWeight: '400', lineHeight: 20 },
  label: { fontFamily, fontSize: 12, fontWeight: '500', lineHeight: 16 },
  amount: { fontFamily, fontSize: 16, fontWeight: '700', lineHeight: 24 },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADII = {
  sm: 4,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
