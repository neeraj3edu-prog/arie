import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Plan } from '@/lib/types';

const SUBTYPE_META = {
  birthday:    { emoji: '🎂', color: '#ff6060', bg: 'rgba(255,90,90,0.15)' },
  appointment: { emoji: '🏥', color: '#2dd4bf', bg: 'rgba(45,212,191,0.15)' },
  class:       { emoji: '📚', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  other:       { emoji: '📅', color: '#4f6ef7', bg: 'rgba(79,110,247,0.15)' },
} as const;

const RECURRENCE_LABEL: Record<string, string> = {
  none: '', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(plan: Plan): string {
  if (!plan.date) return '';
  const [, m, d] = plan.date.split('-').map(Number);
  const recur = RECURRENCE_LABEL[plan.recurrence];
  const base = `${MONTHS[m - 1]} ${d}`;
  const time = plan.time ? ` · ${formatTime(plan.time)}` : '';
  const rec = recur ? `Every ${recur.toLowerCase()}` : base;
  return plan.recurrence !== 'none' ? `${rec}${time}` : `${base}${time}`;
}

function formatTime(time: string): string {
  const [h, min] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, '0')} ${ampm}`;
}

type PlanEventCardProps = {
  plan: Plan;
  onDelete?: () => void;
};

export function PlanEventCard({ plan, onDelete }: PlanEventCardProps) {
  const meta = SUBTYPE_META[plan.subtype] ?? SUBTYPE_META.other;
  const hasNotif = plan.notifyOffset !== 'none';

  return (
    <View style={{
      backgroundColor: '#12121e',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#e8e8ff' }} numberOfLines={1}>{plan.title}</Text>
        <Text style={{ fontSize: 10, color: '#5050a0', marginTop: 1 }}>{formatDate(plan)}</Text>
      </View>

      {hasNotif && (
        <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ionicons name="notifications-outline" size={13} color={meta.color} />
        </View>
      )}

      {onDelete && (
        <Pressable
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 4 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Delete ${plan.title}`}
        >
          <Ionicons name="trash-outline" size={15} color="#4a4a60" />
        </Pressable>
      )}
    </View>
  );
}
