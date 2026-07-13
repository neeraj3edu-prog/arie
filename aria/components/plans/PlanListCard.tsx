import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Plan } from '@/lib/types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const NOTIFY_LABEL: Record<string, string> = {
  day_before: 'Day before',
  morning_of: '9:00 AM',
  '1_hour_before': '1 hr before',
  none: '',
};

type PlanListCardProps = {
  plan: Plan;
  totalItems: number;
  doneItems: number;
  onPress: () => void;
  onDelete?: () => void;
};

export function PlanListCard({ plan, totalItems, doneItems, onPress, onDelete }: PlanListCardProps) {
  const progress = totalItems > 0 ? doneItems / totalItems : 0;
  const allDone = totalItems > 0 && doneItems === totalItems;
  const hasDate = !!plan.date;
  const hasNotif = plan.notifyOffset !== 'none';

  let dateLabel = 'No reminder set';
  if (hasDate && plan.date) {
    const [, m, d] = plan.date.split('-').map(Number);
    dateLabel = `${MONTHS[m - 1]} ${d}`;
  }

  const progressColor = allDone ? '#34c759' : '#a78bfa';
  const remaining = totalItems - doneItems;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#12121e',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 12,
      }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}, ${doneItems} of ${totalItems} done`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={{ fontSize: 17 }}>{getListEmoji(plan.title)}</Text>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#e8e8ff' }} numberOfLines={1}>{plan.title}</Text>
        <Text style={{ fontSize: 10, color: '#5050a0' }}>{doneItems} / {totalItems} done</Text>
        {onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Delete ${plan.title}`}
          >
            <Ionicons name="trash-outline" size={14} color="#4a4a60" />
          </Pressable>
        )}
      </View>

      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: progressColor, borderRadius: 2 }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, color: '#4a4a60' }}>
          {allDone ? `${dateLabel} · All done ✓` : hasDate ? dateLabel : remaining > 0 ? `${remaining} remaining` : 'No date set'}
        </Text>
        {hasNotif ? (
          <Text style={{ fontSize: 10, color: '#a78bfa', fontWeight: '600' }}>
            🔔 {NOTIFY_LABEL[plan.notifyOffset]}
          </Text>
        ) : (
          <Text style={{ fontSize: 10, color: '#3a3a60' }}>🔕</Text>
        )}
      </View>
    </Pressable>
  );
}

function getListEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('grocer') || t.includes('food') || t.includes('market')) return '🛒';
  if (t.includes('pharmac') || t.includes('medicine') || t.includes('drug')) return '💊';
  if (t.includes('school') || t.includes('class') || t.includes('supply') || t.includes('supplies')) return '🎒';
  if (t.includes('chore') || t.includes('clean') || t.includes('home') || t.includes('house')) return '🏠';
  if (t.includes('work') || t.includes('office') || t.includes('meeting')) return '💼';
  return '📋';
}
