import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII, TYPOGRAPHY } from '@/lib/theme';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/useAuth';
import { useReminders } from '@/features/reminders/useReminders';
import { getPerluPerhatianCount } from '@/features/reminders/attention';

const ICON_SIZE = 24;
const BAR_MARGIN = 16;
const BAR_RADIUS = 28;
const ACTIVE_OPACITY = 0.12; /* ~15% opacity for active pill background */

// ── Route ↔ icon mapping ──────────────────────────────────────────────

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  route: string;
  title: string;
  icon: IoniconsName;
  rootHref: Href;
}

const TABS: Record<string, TabConfig> = {
  index: { route: 'index', title: 'Beranda', icon: 'home-outline', rootHref: '/(tabs)' },
  '(reminders)': {
    route: '(reminders)',
    title: 'Pengingat',
    icon: 'notifications-outline',
    rootHref: '/(tabs)/(reminders)',
  },
  '(assets)': {
    route: '(assets)',
    title: 'Aset',
    icon: 'folder-outline',
    rootHref: '/(tabs)/(assets)',
  },
  pengaturan: {
    route: 'pengaturan',
    title: 'Pengaturan',
    icon: 'settings-outline',
    rootHref: '/(tabs)/pengaturan',
  },
};

// ── Minimal props contract ────────────────────────────────────────────

interface BottomTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  // React Navigation expects specific event types; accept any for compatibility
  navigation: any;
}

// ── Component ─────────────────────────────────────────────────────────

export default function BottomNavigation(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const router = useRouter();
  const safe = useSafeAreaInsets();

  // ── Badge count for Pengingat tab ────────────────────────────────────

  const { user } = useAuth();
  const { reminders, fetchReminders } = useReminders();
  const badgeCount = user ? getPerluPerhatianCount(reminders) : 0;

  useFocusEffect(
    React.useCallback(() => {
      if (user) fetchReminders();
    }, [fetchReminders, user]),
  );

  // ── Animation ────────────────────────────────────────────────────────

  const routes = state.routes.filter((route) => TABS[route.name]);
  const animValues = useRef(routes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel(
      animValues.map((val, i) =>
        Animated.timing(val, {
          toValue: state.routes[state.index]?.key === routes[i]?.key ? 1 : 0,
          duration: 220,
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [state.index, state.routes, routes, animValues]);

  // ── Colors ──────────────────────────────────────────────────────────

  const activeColor = COLORS.primary;
  const inactiveColor = COLORS.onSurfaceVariant;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(safe.bottom, 6) }]}>
      <View style={styles.bar}>
        {routes.map((route, i) => {
          const tab = TABS[route.name];
          const isFocused = state.routes[state.index]?.key === route.key;
          const anim = animValues[i];

          const pillScale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          });
          const iconColor = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [inactiveColor, activeColor],
          });
          const labelColor = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [inactiveColor, activeColor],
          });

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) {
              // Explicitly pop any nested stack inside the target tab so the
              // next navigation lands on the tab's root screen.
              navigation.navigate(route.name, { pop: true });
              // Then replace the route to ensure the stack is reset.
              router.replace(tab.rootHref);
            }
          };

          const handleLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={tab.route}
              onPress={handlePress}
              onLongPress={handleLongPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={
                tab.route === '(reminders)' && badgeCount > 0
                  ? `${tab.title}, ${badgeCount} perlu perhatian`
                  : tab.title
              }
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={styles.tabInner}>
                {/* Active pill background */}
                <Animated.View
                  style={[
                    styles.pill,
                    {
                      opacity: anim,
                      transform: [{ scale: pillScale }],
                      backgroundColor: `${activeColor}${Math.round(ACTIVE_OPACITY * 255).toString(16).padStart(2, '0')}`,
                    },
                  ]}
                />

                {/* Icon */}
                <View style={styles.iconWrap}>
                  <Ionicons name={tab.icon} size={ICON_SIZE} color={iconColor as unknown as string} />
                  {/* Badge on Reminder tab */}
                  {tab.route === '(reminders)' && badgeCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Label */}
                <Animated.Text style={[styles.label, { color: labelColor as unknown as string }]}>
                  {tab.title}
                </Animated.Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: BAR_MARGIN,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BAR_RADIUS,
    paddingVertical: 6,
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 56,
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
  },
  iconWrap: {
    width: ICON_SIZE + 4,
    height: ICON_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    ...TYPOGRAPHY.label,
    fontSize: 12,
    includeFontPadding: false,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.statusCritical,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.onPrimary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});
