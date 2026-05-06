import { View, ActivityIndicator } from 'react-native';

// This route exists solely to give Expo Router a valid screen for the
// planora://auth/callback deep link. The actual code exchange happens in
// _layout.tsx via Linking.addEventListener. Once the session is established,
// useProtectedRoute redirects to /(tabs)/tasks automatically.
export default function AuthCallback() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#4f6ef7" />
    </View>
  );
}
