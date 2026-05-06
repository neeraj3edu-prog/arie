import { View, Text, Pressable } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_DEFS = [
  { name: 'tasks',    label: 'Tasks',    icon: 'calendar-outline' as IoniconName, activeIcon: 'calendar' as IoniconName, color: '#4f6ef7' },
  { name: 'expenses', label: 'Expenses', icon: 'card-outline'     as IoniconName, activeIcon: 'card'     as IoniconName, color: '#f7a24f' },
] as const;

// Fixed visible height of the tab bar (icon + gap + label + top padding)
const TAB_CONTENT_HEIGHT = 56;

function IconTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        backgroundColor: '#0a0a0f',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 12,
        paddingBottom: bottomPad,
      }}
    >
      {TAB_DEFS.map((tab) => {
        const isFocused = (pathname ?? '').includes(tab.name);
        return (
          <Pressable
            key={tab.name}
            onPress={() => router.navigate(`/(tabs)/${tab.name}`)}
            style={({ pressed }) => ({
              width: `${100 / TAB_DEFS.length}%`,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
              opacity: pressed ? 0.5 : 1,
            })}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: isFocused }}
          >
            <Ionicons
              name={isFocused ? tab.activeIcon : tab.icon}
              size={26}
              color={isFocused ? tab.color : '#4a4a60'}
            />
            <Text style={{ fontSize: 11, fontWeight: '600', color: isFocused ? tab.color : '#4a4a60' }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  useFonts({ ...Ionicons.font });
  const insets = useSafeAreaInsets();
  // Total tab bar height = content + bottom safe area — screens need this as padding
  const tabBarHeight = TAB_CONTENT_HEIGHT + Math.max(insets.bottom, 16);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          // Push screen content up so it isn't hidden under the absolute tab bar
          contentStyle: { paddingBottom: tabBarHeight },
        }}
      >
        <Tabs.Screen name="tasks"    options={{ title: 'Tasks' }} />
        <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
        <Tabs.Screen name="index"    options={{ href: null }} />
        <Tabs.Screen name="two"      options={{ href: null }} />
      </Tabs>

      {/* Absolutely positioned — left:0 right:0 guarantees full screen width */}
      <IconTabBar />
    </View>
  );
}
