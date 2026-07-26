import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/ui/glass';
import { TabBar } from '@/constants/layout';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * JS tabs rather than `expo-router/unstable-native-tabs`: the native tab bar is
 * still alpha in SDK 57, caps at 5 tabs on Android, cannot report its own height,
 * and does not support scroll-to-top — which the infinite home feed needs.
 *
 * Note the import path. `import { Tabs } from 'expo-router'` is deprecated in
 * SDK 57 and re-exports this same navigator.
 *
 * The bar itself is styled as a floating capsule — inset from both edges and
 * the bottom safe area, rounded, and blurred — matching the iOS 18 tab bar
 * (Music, Photos) rather than the classic edge-to-edge Android/older-iOS bar.
 */

function TabBarBackground() {
  // radius=0 here: the outer `tabBarStyle` owns the capsule radius and clips
  // this to it via overflow:hidden, so this only needs to fill the shape.
  // The extra tint pushes the capsule toward the near-opaque black of the
  // reference design while keeping the blur alive at the edges.
  return (
    <Glass
      variant="regular"
      intensity={50}
      radius={0}
      bordered={false}
      style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, styles.barTint]} />
    </Glass>
  );
}

/**
 * The reference bar highlights the active destination as a solid white pill
 * with a black glyph — the same "one white element = the action" rule the
 * rest of the app follows.
 */
function TabIcon({
  focused,
  active,
  inactive,
}: {
  focused: boolean;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Ionicons
        name={focused ? active : inactive}
        size={23}
        color={focused ? '#0A0A0B' : 'rgba(255,255,255,0.72)'}
      />
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        // Icon-only bar; `title` still names each screen for accessibility.
        tabBarShowLabel: false,
        tabBarItemStyle: { justifyContent: 'center' },
        // The icon wrapper keeps a fixed label-era height; letting it flex
        // removes the phantom gap under the icons.
        tabBarIconStyle: { flex: 1 },
        // Transparent so the Glass layer behind it is what actually shows.
        tabBarStyle: {
          position: 'absolute',
          left: TabBar.inset,
          right: TabBar.inset,
          bottom: insets.bottom + TabBar.floatGap,
          height: TabBar.height,
          borderRadius: Radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.glassBorder,
          backgroundColor: 'transparent',
          overflow: 'hidden',
          elevation: 0,
          // A floating capsule needs its own shadow — there's no edge-to-edge
          // surface behind it to imply depth.
          shadowColor: '#000000',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarBackground: TabBarBackground,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="home" inactive="home-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="search" inactive="search-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="ticket" inactive="ticket-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="person" inactive="person-outline" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barTint: { backgroundColor: 'rgba(12, 12, 14, 0.55)' },
  iconPill: {
    minWidth: 62,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: { backgroundColor: '#FFFFFF' },
});
