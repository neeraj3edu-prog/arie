import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSyncStore } from '@/store/syncStore';
import { triggerSync } from '@/lib/sync/syncEngine';

export function useNetworkStatus(): void {
  const setOnline = useSyncStore((s) => s.setOnline);

  useEffect(() => {
    // NetInfo's web implementation fires state changes synchronously during
    // React's commit phase on some browsers, causing update-depth errors.
    // On web we're always treated as online; sync is not needed.
    if (Platform.OS === 'web') {
      setOnline(true);
      return;
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setOnline(online);
      if (online) triggerSync();
    });
    return unsubscribe;
  }, [setOnline]);
}
