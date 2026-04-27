import { View, Text, Pressable } from 'react-native';
import { CalendarHeader } from './CalendarHeader';
import { daysInMonth, firstDayOfMonth, localDateISO } from '@/lib/utils/date';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type MonthCalendarProps = {
  activeMonth: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  accentColor?: string;
  datesWithTasks?: Set<string>;
  datesWithExpenses?: Set<string>;
};

export function MonthCalendar({
  activeMonth,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  accentColor = '#4f6ef7',
  datesWithTasks = new Set(),
  datesWithExpenses = new Set(),
}: MonthCalendarProps) {
  const [year, month] = activeMonth.split('-').map(Number);
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const today = localDateISO();

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const remainder = cells.length % 7;
  if (remainder !== 0) cells.push(...Array(7 - remainder).fill(null));

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  // Find which row contains the selected date
  const selectedDay = (() => {
    if (!selectedDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)) return -1;
    return parseInt(selectedDate.split('-')[2], 10);
  })();
  const selectedRowIndex = rows.findIndex((row) => row.includes(selectedDay));

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: '#13131a', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
      <CalendarHeader activeMonth={activeMonth} onPrev={onPrevMonth} onNext={onNextMonth} />

      {/* Day of week labels */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: i === 0 || i === 6 ? '#ff453a66' : '#4a4a60' }}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{ paddingHorizontal: 8, paddingBottom: 12 }}>
        {rows.map((row, ri) => {
          const isSelectedRow = ri === selectedRowIndex;
          return (
            <View
              key={ri}
              style={{
                flexDirection: 'row',
                marginVertical: 2,
                borderRadius: 12,
                backgroundColor: isSelectedRow ? `${accentColor}18` : 'transparent',
                overflow: 'hidden',
              }}
            >
              {row.map((day, ci) => {
                if (!day) {
                  return <View key={ci} style={{ flex: 1, height: 40 }} />;
                }
                const dateISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dateISO === selectedDate;
                const isToday = dateISO === today;
                const isSunSat = ci === 0 || ci === 6;
                const hasDot = datesWithTasks.has(dateISO) || datesWithExpenses.has(dateISO);

                return (
                  <Pressable
                    key={ci}
                    onPress={() => onSelectDate(dateISO)}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={dateISO}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? accentColor : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: accentColor,
                    }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: isSelected || isToday ? '700' : '400',
                        color: isSelected ? '#fff' : isToday ? accentColor : isSunSat ? '#ff453a66' : '#f0f0f5',
                      }}>
                        {day}
                      </Text>
                    </View>
                    {hasDot && !isSelected && (
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accentColor, marginTop: 2, opacity: 0.7 }} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}
