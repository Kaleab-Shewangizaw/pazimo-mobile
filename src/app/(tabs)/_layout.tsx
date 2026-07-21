import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { Glass } from '@/components/ui/glass';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * JS tabs rather than `expo-router/unstable-native-tabs`: the native tab bar is
 * still alpha in SDK 57, caps at 5 tabs on Android, cannot report its own height,
 * and does not support scroll-to-top — which the infinite home feed needs.
 *
 * Note the import path. `import { Tabs } from 'expo-router'` is deprecated in
 * SDK 57 and re-exports this same navigator.
 */

const TAB_BAR_HEIGHT = 56;

/** Blurred background is one view for the whole bar, not one per tab. */
function TabBarBackground() {
  return <Glass variant="regular" intensity={60} radius={0} bordered={false} style={StyleSheet.absoluteFill} />;
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        // Transparent so the glass layer behind it is what shows through.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.hairline,
          height: TAB_BAR_HEIGHT,
          paddingTop: Spacing.xs,
          elevation: 0,
        },
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
