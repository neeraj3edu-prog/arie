import { View, Text, Pressable, Platform } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_DEFS = [
  { name: 'tasks',    label: 'Tasks',    icon: 'calendar-outline' as IoniconName, activeIcon: 'calendar' as IoniconName, color: '#4f6ef7' },
  { name: 'expenses', label: 'Expenses', icon: 'card-outline'     as IoniconName, activeIcon: 'card'     as IoniconName, color: '#f7a24f' },
] as const;

function IconTabBar() {
  const pathname = usePathname();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#0a0a0f',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      }}
    >
      {TAB_DEFS.map((tab) => {
        const isFocused = pathname.includes(tab.name);
        return (
          <Pressable
            key={tab.name}
            onPress={() => router.navigate(`/(tabs)/${tab.name}`)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              opacity: pressed ? 0.5 : 1,
            })}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: isFocused }}
          >
            <Ionicons
              name={isFocused ? tab.activeIcon : tab.icon}
              size={24}
              color={isFocused ? tab.color : '#4a4a60'}
            />
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: isFocused ? tab.color : '#4a4a60',
            }}>
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

  return (
    <Tabs
      tabBar={() => <IconTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="tasks"    options={{ title: 'Tasks' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="index"    options={{ href: null }} />
      <Tabs.Screen name="two"      options={{ href: null }} />
    </Tabs>
  );
}
