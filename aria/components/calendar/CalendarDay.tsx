import { Pressable, Text, View } from 'react-native';

type CalendarDayProps = {
  day: number;
  dateISO: string;
  isSelected: boolean;
  isToday: boolean;
  hasTasks: boolean;
  hasExpenses: boolean;
  onPress: (date: string) => void;
};

export function CalendarDay({
  day,
  dateISO,
  isSelected,
  isToday,
  hasTasks,
  hasExpenses,
  onPress,
}: CalendarDayProps) {
  return (
    <Pressable
      onPress={() => onPress(dateISO)}
      className="flex-1 items-center py-1"
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${dateISO}${isToday ? ', today' : ''}${hasTasks ? ', has tasks' : ''}${hasExpenses ? ', has expenses' : ''}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View
        className={`w-8 h-8 rounded-full items-center justify-center
          ${isSelected ? 'bg-tasks' : isToday ? 'border border-tasks' : ''}`}
      >
        <Text
          className={`text-sm font-medium
            ${isSelected ? 'text-white' : isToday ? 'text-tasks' : 'text-text-primary'}`}
        >
          {day}
        </Text>
      </View>

      {/* Dot indicators */}
      <View className="flex-row gap-0.5 mt-0.5 h-1.5">
        {hasTasks && (
          <View className="w-1 h-1 rounded-full bg-tasks" />
        )}
        {hasExpenses && (
          <View className="w-1 h-1 rounded-full bg-expenses" />
        )}
      </View>
    </Pressable>
  );
}
