import { Tabs } from 'expo-router/js-tabs';
import { type Icon, type IconWeight } from 'phosphor-react-native';
// Per-icon subpath imports, not the package root: `phosphor-react-native`'s
// barrel is a single ~9,000-icon module that Babel already warns about at
// 500KB+, and Metro will not tree-shake it away. The line above is erased at
// build time, so it costs nothing.
import { FilmSlateIcon } from 'phosphor-react-native/src/icons/FilmSlate';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { TicketIcon } from 'phosphor-react-native/src/icons/Ticket';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import type { ColorValue } from 'react-native';

import { LiquidTabBar } from '@/components/navigation/liquid-tab-bar';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

/**
 * JS tabs rather than `expo-router/unstable-native-tabs`: the native tab bar is
 * still alpha in SDK 57, caps at 5 tabs on Android, cannot report its own height,
 * and does not support scroll-to-top — which the infinite home feed needs.
 *
 * Note the import path. `import { Tabs } from 'expo-router'` is deprecated in
 * SDK 57 and re-exports this same navigator.
 *
 * The bar is drawn by `LiquidTabBar`, which owns its own shape, glass and
 * selection indicator — so `tabBarStyle` and `tabBarBackground` no longer apply
 * and are not set here.
 *
 * `tabBarIcon` is called *twice* per tab by the bar, once for each focus state,
 * so it must be a pure function of `focused` — the two results are stacked and
 * crossfaded. Phosphor's `fill` weight is a separately drawn glyph rather than a
 * thickened stroke, which is what lets the selected icon hold its own against
 * the solid white pill.
 */

type TabIconArgs = { focused: boolean; color: ColorValue; size: number };

/**
 * React Navigation types `color` as `ColorValue` so platform colour objects are
 * expressible; `LiquidTabBar` only ever passes plain strings, which is the
 * narrower thing Phosphor accepts.
 */
function tabIcon(Glyph: Icon, activeWeight: IconWeight = 'fill') {
  return function TabIcon({ focused, color, size }: TabIconArgs) {
    return <Glyph size={size} color={color as string} weight={focused ? activeWeight : 'regular'} />;
  };
}

// Module scope so each renderer keeps a stable identity — the bar memoises its
// slots on it.
const homeIcon = tabIcon(HouseIcon);
const cinemaIcon = tabIcon(FilmSlateIcon);
const ticketsIcon = tabIcon(TicketIcon);
const profileIcon = tabIcon(UserIcon);

/**
 * The centre action says its name rather than drawing one. A drink glyph has to
 * be guessed at; the word does not, and this is the one control in the bar whose
 * purpose isn't obvious from its position.
 */
function refillLabel({ color }: { color: string }) {
  return (
    <Text variant="label" style={{ color, fontWeight: '900', letterSpacing: 0.5, fontSize: 12, textTransform: 'uppercase' }}>
      Refill
    </Text>
  );
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => (
        <LiquidTabBar {...props} centerRoute="refill" renderCenterContent={refillLabel} />
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        // Icon-only bar; `title` still names each screen for accessibility.
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: homeIcon }} />
      <Tabs.Screen name="cinema" options={{ title: 'Cinema', tabBarIcon: cinemaIcon }} />
      {/* Raised out of the bar as the centre action — see `LiquidTabBar`. It
          declares no icon because the bar draws that one itself. */}
      <Tabs.Screen name="refill" options={{ title: 'Refill' }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets', tabBarIcon: ticketsIcon }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: profileIcon }} />
      {/* Search keeps working and keeps its route — it is pushed from the home
          category rail and the empty tickets state — it just gave up its slot
          to Cinema. `href: null` is how expo-router says "routable, not on the
          bar". */}
      <Tabs.Screen name="discover" options={{ title: 'Search', href: null }} />
    </Tabs>
  );
}
