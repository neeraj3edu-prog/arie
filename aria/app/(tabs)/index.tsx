import { Redirect } from 'expo-router';

// Default tab index — always send to Tasks
export default function TabIndex() {
  return <Redirect href="/(tabs)/tasks" />;
}
