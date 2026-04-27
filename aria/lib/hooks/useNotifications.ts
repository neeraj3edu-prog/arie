import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === 'granted'
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();

  if (status !== 'granted') return;

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId || projectId === 'placeholder-eas-project-id') return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('profiles').upsert({ id: user.id, push_token: token });
}

export async function scheduleTaskReminder(params: {
  taskId: string;
  title: string;
  body: string;
  sendAt: Date;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', session.user.id)
    .single();

  if (!profile?.push_token) return;

  await supabase.from('notification_queue').insert({
    user_id: session.user.id,
    push_token: profile.push_token,
    title: params.title,
    body: params.body,
    data: { task_id: params.taskId, type: 'reminder' },
    send_at: params.sendAt.toISOString(),
  });
}

export function useNotificationHandler(): void {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { task_id?: string };
      if (data.task_id) {
        router.push('/(tabs)/tasks');
      }
    });
    return () => sub.remove();
  }, [router]);
}

export function useRegisterPushToken(): void {
  const { user } = useAuthStore();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (user) registerPushToken();
  }, [user]);
}
