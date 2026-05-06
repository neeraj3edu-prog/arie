import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="tasks/index"    options={{ title: 'Tasks' }} />
      <Tabs.Screen name="expenses/index" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="index"          options={{ href: null }} />
      <Tabs.Screen name="two"            options={{ href: null }} />
    </Tabs>
  );
}
