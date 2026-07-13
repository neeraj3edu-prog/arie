import { Platform } from 'react-native';
import type { Plan } from '../types';

export async function scheduleNotificationForPlan(plan: Plan & { id: string }): Promise<string | null> {
  if (Platform.OS === 'web' || !plan.date || plan.notifyOffset === 'none') return null;

  const [y, m, d] = plan.date.split('-').map(Number);
  const baseDate = new Date(y, m - 1, d);
  let triggerDate: Date;

  if (plan.notifyOffset === 'day_before') {
    triggerDate = new Date(baseDate);
    triggerDate.setDate(triggerDate.getDate() - 1);
    triggerDate.setHours(9, 0, 0, 0);
  } else if (plan.notifyOffset === 'morning_of') {
    triggerDate = new Date(baseDate);
    triggerDate.setHours(9, 0, 0, 0);
  } else if (plan.notifyOffset === '1_hour_before') {
    if (!plan.time) return null;
    const [h, min] = plan.time.split(':').map(Number);
    triggerDate = new Date(baseDate);
    triggerDate.setHours(h, min, 0, 0);
    triggerDate.setTime(triggerDate.getTime() - 60 * 60 * 1000);
  } else {
    return null;
  }

  const secondsUntil = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
  if (secondsUntil <= 0) return null;

  try {
    // Dynamic import keeps this tree-shaken from web bundle
    const Notifications = await import('expo-notifications');
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: plan.title,
        body: plan.type === 'list' ? "Don't forget your list!" : 'Reminder',
        data: { plan_id: plan.id, type: 'plan' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
        repeats: false,
      },
    });
    return notifId;
  } catch {
    return null;
  }
}

export async function cancelPlanNotification(notificationId: string | null): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore — notification may have already fired
  }
}
