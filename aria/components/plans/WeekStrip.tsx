import { View, Text, Pressable, ScrollView } from 'react-native';
import { localDateISO } from '@/lib/utils/date';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return localDateISO(date);
}

type WeekStripProps = {
  datesWithPlans: Set<string>;
  accent?: string;
};

export function WeekStrip({ datesWithPlans, accent = '#a78bfa' }: WeekStripProps) {
  const today = localDateISO();

  // 7 days: 3 before today, today, 3 after
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(today, i - 3);
    const [y, m, d] = iso.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // month is 0-indexed
    return { iso, dayNum: d, letter: DAY_LETTERS[dayOfWeek], isToday: iso === today };
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 4 }}
      style={{ flexShrink: 0 }}
    >
      {days.map(({ iso, dayNum, letter, isToday }) => {
        const hasPlan = datesWithPlans.has(iso);
        return (
          <View
            key={iso}
            style={{
              alignItems: 'center',
              minWidth: 36,
              paddingVertical: 6,
              paddingHorizontal: 4,
              borderRadius: 10,
              backgroundColor: isToday ? accent : 'transparent',
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '600', color: isToday ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
              {letter}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: isToday ? '#fff' : '#b0b0d0' }}>
              {dayNum}
            </Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 3, backgroundColor: hasPlan ? (isToday ? 'rgba(255,255,255,0.6)' : accent + '99') : 'transparent' }} />
          </View>
        );
      })}
    </ScrollView>
  );
}
