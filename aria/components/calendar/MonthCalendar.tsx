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

type CalendarCell =
  | { type: 'current'; day: number; dateISO: string }
  | { type: 'adjacent'; day: number; dateISO: string };

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

  // Previous month info for leading cells
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevMonthDays = daysInMonth(prevYear, prevMonth);

  // Next month info for trailing cells
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const pad = (n: number) => String(n).padStart(2, '0');

  // Build the full 6-row grid with adjacent-month filler
  const cells: CalendarCell[] = [];

  // Leading days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    cells.push({ type: 'adjacent', day, dateISO: `${prevYear}-${pad(prevMonth)}-${pad(day)}` });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ type: 'current', day: d, dateISO: `${year}-${pad(month)}-${pad(d)}` });
  }

  // Trailing days from next month
  const remainder = cells.length % 7;
  const trailingCount = remainder === 0 ? 0 : 7 - remainder;
  for (let d = 1; d <= trailingCount; d++) {
    cells.push({ type: 'adjacent', day: d, dateISO: `${nextYear}-${pad(nextMonth)}-${pad(d)}` });
  }

  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const selectedRowIndex = rows.findIndex((row) =>
    row.some((c) => c.dateISO === selectedDate)
  );

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: '#13131a', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
      <CalendarHeader activeMonth={activeMonth} onPrev={onPrevMonth} onNext={onNextMonth} />

      {/* Day-of-week labels */}
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
              {row.map((cell, ci) => {
                const isCurrentMonth = cell.type === 'current';
                const isSelected = cell.dateISO === selectedDate;
                const isToday = cell.dateISO === today;
                const isSunSat = ci === 0 || ci === 6;
                const hasDot = isCurrentMonth && (datesWithTasks.has(cell.dateISO) || datesWithExpenses.has(cell.dateISO));

                return (
                  <Pressable
                    key={ci}
                    onPress={() => onSelectDate(cell.dateISO)}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={cell.dateISO}
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
                        color: isSelected
                          ? '#fff'
                          : !isCurrentMonth
                            ? '#3a3a50'
                            : isToday
                              ? accentColor
                              : isSunSat
                                ? '#ff453a66'
                                : '#f0f0f5',
                      }}>
                        {cell.day}
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
