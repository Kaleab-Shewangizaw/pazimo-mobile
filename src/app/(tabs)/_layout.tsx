import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';
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
  return (
    <Glass
      variant="regular"
      intensity={50}
      radius={0}
      bordered={false}
      style={StyleSheet.absoluteFill}
    />
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
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarIconStyle: { marginTop: 2 },
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'ticket' : 'ticket-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
