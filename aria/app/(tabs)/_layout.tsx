import { View, Text, Pressable, Platform } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_DEFS = [
  { name: 'tasks',    label: 'Tasks',    icon: 'calendar-outline' as IoniconName, activeIcon: 'calendar' as IoniconName, color: '#4f6ef7' },
  { name: 'expenses', label: 'Expenses', icon: 'card-outline'     as IoniconName, activeIcon: 'card'     as IoniconName, color: '#f7a24f' },
] as const;

// Use usePathname() — reads the URL directly, always accurate on web and native
function PillTabBar() {
  const pathname = usePathname();

  return (
    <View
      style={{
        backgroundColor: '#0a0a0f',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 14,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#13131a',
          borderRadius: 20,
          padding: 4,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -2 },
          elevation: 12,
          gap: 4,
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: 16,
                backgroundColor: isFocused ? tab.color : 'transparent',
                opacity: pressed ? 0.75 : 1,
                gap: 3,
              })}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons
                name={isFocused ? tab.activeIcon : tab.icon}
                size={20}
                color={isFocused ? '#fff' : '#4a4a60'}
              />
              <Text style={{
                color: isFocused ? '#fff' : '#4a4a60',
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.2,
              }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  useFonts({ ...Ionicons.font });

  return (
    <Tabs
      tabBar={() => <PillTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="tasks"    options={{ title: 'Tasks' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="index"    options={{ href: null }} />
      <Tabs.Screen name="two"      options={{ href: null }} />
    </Tabs>
  );
}
