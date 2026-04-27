import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useCalendar } from '@/lib/hooks/useCalendar';
import { useExpensesForMonth, useExpensesForDate } from '@/lib/hooks/useExpenses';
import { useTasks } from '@/lib/hooks/useTasks';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { AddExpenseSheet } from '@/components/input/AddExpenseSheet';
import { VoiceSheet } from '@/components/voice/VoiceSheet';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { isToday } from '@/lib/utils/date';
import type { NewExpense } from '@/lib/types';

const ACCENT = '#f7a24f';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type DayView = 'day' | 'month';

export default function ExpensesScreen() {
  const {
    selectedDate, activeMonth, setSelectedDate,
    goToPrevMonth, goToNextMonth, goToToday,
  } = useCalendar();

  const { data: monthExpenses = [], isLoading } = useExpensesForMonth(activeMonth);
  const { expenses: dayExpenses = [], addExpenses, removeExpense } = useExpensesForDate(selectedDate);
  const { tasks } = useTasks(selectedDate);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const [dayView, setDayView] = useState<DayView>('day');

  const datesWithExpenses = new Set(monthExpenses.map((e) => e.date));
  const datesWithTasks = new Set(tasks.map((t) => t.scheduledDate));
  const displayExpenses = dayView === 'day' ? dayExpenses : monthExpenses;

  const sectionLabel = (() => {
    if (isToday(selectedDate)) return 'Today';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  const [year, month] = activeMonth.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  function handleAddExpenses(expenses: NewExpense[]): void {
    addExpenses.mutate(expenses);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <View>
          <Text style={{ color: '#f0f0f5', fontSize: 28, fontWeight: '700', lineHeight: 34 }}>Expenses</Text>
          <Text style={{ color: '#8a8aa0', fontSize: 13, marginTop: 2 }}>{monthLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Pressable
            onPress={() => setScanSheetVisible(true)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}
            accessible accessibilityRole="button" accessibilityLabel="Scan receipt"
          >
            <Ionicons name="scan-outline" size={18} color="#f0f0f5" />
          </Pressable>
          <Pressable
            onPress={() => setAddSheetVisible(true)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}
            accessible accessibilityRole="button" accessibilityLabel="Add expense"
          >
            <Ionicons name="add" size={22} color="#f0f0f5" />
          </Pressable>
        </View>
      </View>

      {/* Calendar */}
      <MonthCalendar
        activeMonth={activeMonth}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        accentColor={ACCENT}
        datesWithTasks={datesWithTasks}
        datesWithExpenses={datesWithExpenses}
      />

      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
        <View>
          <Text style={{ color: '#f0f0f5', fontSize: 20, fontWeight: '700' }}>{sectionLabel}</Text>
          {displayExpenses.length > 0 && (
            <Text style={{ color: '#8a8aa0', fontSize: 13, marginTop: 2 }}>
              {displayExpenses.length} expense{displayExpenses.length !== 1 ? 's' : ''} · <Text style={{ color: '#f7a24f' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(displayExpenses.reduce((s, e) => s + e.amount, 0) / 100)}</Text>
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: '#13131a', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
          {(['day', 'month'] as DayView[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setDayView(v)}
              style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: dayView === v ? ACCENT : 'transparent' }}
            >
              <Text style={{ color: dayView === v ? '#fff' : '#8a8aa0', fontSize: 12, fontWeight: '600' }}>
                {v === 'day' ? 'Day' : 'Month'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Expense list */}
      {isLoading ? (
        <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 32 }} />
      ) : (
        <ExpenseList expenses={displayExpenses} onDelete={(id) => removeExpense.mutate(id)} />
      )}

      {/* Centered mic FAB — sits above the floating tab bar */}
      <Pressable
        onPress={() => setVoiceSheetVisible(true)}
        style={{
          position: 'absolute', bottom: 24,
          alignSelf: 'center', left: '50%', marginLeft: -32,
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: ACCENT,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: ACCENT, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
        accessible accessibilityRole="button" accessibilityLabel="Add expenses by voice"
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </Pressable>

      <AddExpenseSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onAdd={handleAddExpenses}
        defaultDate={selectedDate}
      />
      <VoiceSheet
        visible={voiceSheetVisible}
        mode="expenses"
        onClose={() => setVoiceSheetVisible(false)}
        onAddTasks={() => {}}
        onAddExpenses={handleAddExpenses}
        defaultDate={selectedDate}
      />
      <ScanSheet
        visible={scanSheetVisible}
        onClose={() => setScanSheetVisible(false)}
        onAddExpenses={handleAddExpenses}
      />
    </SafeAreaView>
  );
}
