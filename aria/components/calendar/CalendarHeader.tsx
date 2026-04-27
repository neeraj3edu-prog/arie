import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

type CalendarHeaderProps = {
  activeMonth: string; // 'YYYY-MM'
  onPrev: () => void;
  onNext: () => void;
};

export function CalendarHeader({ activeMonth, onPrev, onNext }: CalendarHeaderProps) {
  const [year, month] = activeMonth.split('-').map(Number);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
      <Pressable
        onPress={onPrev}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}
        accessible accessibilityRole="button" accessibilityLabel="Previous month"
      >
        <Ionicons name="chevron-back" size={18} color="#8a8aa0" />
      </Pressable>

      <Text style={{ color: '#f0f0f5', fontSize: 16, fontWeight: '600' }}>
        <Text style={{ color: '#f0f0f5' }}>{MONTH_NAMES[month - 1]} </Text>
        <Text style={{ color: '#8a8aa0' }}>{year}</Text>
      </Text>

      <Pressable
        onPress={onNext}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}
        accessible accessibilityRole="button" accessibilityLabel="Next month"
      >
        <Ionicons name="chevron-forward" size={18} color="#8a8aa0" />
      </Pressable>
    </View>
  );
}
