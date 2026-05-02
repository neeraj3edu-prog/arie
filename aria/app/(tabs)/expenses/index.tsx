import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useCalendar } from '@/lib/hooks/useCalendar';
import { useExpensesForMonth, useExpensesForDate } from '@/lib/hooks/useExpenses';
import { useTasks } from '@/lib/hooks/useTasks';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { ExpenseItem } from '@/components/expenses/ExpenseItem';
import { AddExpenseSheet } from '@/components/input/AddExpenseSheet';
import { VoiceSheet } from '@/components/voice/VoiceSheet';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { isToday } from '@/lib/utils/date';
import { formatCents } from '@/lib/utils/currency';
import type { NewExpense } from '@/lib/types';

const ACCENT = '#f7a24f';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type DayView = 'day' | 'month';

const EXPENSE_PROMPTS = [
  '"Milk $3, bread $2 at Walmart"',
  '"Coffee $5 at Starbucks"',
  '"Uber ride $12, lunch $9"',
];

export default function ExpensesScreen() {
  const { selectedDate, activeMonth, setSelectedDate, goToPrevMonth, goToNextMonth, goToToday } = useCalendar();
  const { data: monthExpenses = [] } = useExpensesForMonth(activeMonth);
  const { expenses: dayExpenses = [], loading: isLoading, addExpenses, removeExpense } = useExpensesForDate(selectedDate);
  const { tasks } = useTasks(selectedDate);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const [dayView, setDayView] = useState<DayView>('day');

  const datesWithExpenses = new Set(monthExpenses.map((e) => e.date));
  const datesWithTasks = new Set(tasks.map((t) => t.scheduledDate));
  const displayExpenses = dayView === 'day' ? dayExpenses : monthExpenses;

  const sectionLabel = isToday(selectedDate)
    ? 'Today'
    : new Date(...(selectedDate.split('-').map(Number) as [number, number, number])).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const [year, month] = activeMonth.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  function handleAddExpenses(expenses: NewExpense[]): void {
    addExpenses.mutate(expenses);
  }

  const total = displayExpenses.reduce((s, e) => s + e.amount, 0);
  const currency = displayExpenses[0]?.currency ?? 'USD';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['top']}>
      {/* Single top-level ScrollView — most reliable on iOS Safari */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <View>
            <Text style={{ color: '#f0f0f5', fontSize: 28, fontWeight: '700', lineHeight: 34 }}>Expenses</Text>
            <Text style={{ color: '#8a8aa0', fontSize: 13, marginTop: 2 }}>{monthLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Pressable onPress={() => setScanSheetVisible(true)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}
              accessible accessibilityRole="button" accessibilityLabel="Scan receipt">
              <Ionicons name="scan-outline" size={18} color="#f0f0f5" />
            </Pressable>
            <Pressable onPress={() => setAddSheetVisible(true)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}
              accessible accessibilityRole="button" accessibilityLabel="Add expense">
              <Ionicons name="add" size={22} color="#f0f0f5" />
            </Pressable>
          </View>
        </View>

        {/* Calendar */}
        <MonthCalendar
          activeMonth={activeMonth} selectedDate={selectedDate}
          onSelectDate={setSelectedDate} onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth} onToday={goToToday}
          accentColor={ACCENT} datesWithTasks={datesWithTasks} datesWithExpenses={datesWithExpenses}
        />

        {/* Section header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
          <View>
            <Text style={{ color: '#f0f0f5', fontSize: 20, fontWeight: '700' }}>{sectionLabel}</Text>
            {displayExpenses.length > 0 && (
              <Text style={{ color: '#8a8aa0', fontSize: 13, marginTop: 2 }}>
                {displayExpenses.length} expense{displayExpenses.length !== 1 ? 's' : ''} · <Text style={{ color: ACCENT }}>{formatCents(total, currency)}</Text>
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#13131a', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
            {(['day', 'month'] as DayView[]).map((v) => (
              <Pressable key={v} onPress={() => setDayView(v)}
                style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: dayView === v ? ACCENT : 'transparent' }}>
                <Text style={{ color: dayView === v ? '#fff' : '#8a8aa0', fontSize: 12, fontWeight: '600' }}>
                  {v === 'day' ? 'Day' : 'Month'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Expense list — rendered inline, no nested ScrollView */}
        {isLoading ? (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 32 }} />
        ) : displayExpenses.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ borderWidth: 1, borderColor: 'rgba(247,162,79,0.3)', borderRadius: 16, padding: 20, backgroundColor: 'rgba(247,162,79,0.06)' }}>
              <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>TRY SAYING...</Text>
              {EXPENSE_PROMPTS.map((p, i) => (
                <Text key={i} style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 22, marginBottom: 4 }}>{p}</Text>
              ))}
              <Text style={{ color: '#4a4a60', fontSize: 12, marginTop: 12 }}>Or tap the scan icon to photograph a receipt</Text>
            </View>
          </View>
        ) : (
          <View style={{ marginHorizontal: 16 }}>
            <Text style={{ color: ACCENT, fontSize: 13, marginBottom: 10 }}>
              {displayExpenses.length} expense{displayExpenses.length !== 1 ? 's' : ''} · {formatCents(total, currency)}
            </Text>
            <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
              {displayExpenses.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />}
                  <ExpenseItem expense={item} onDelete={() => removeExpense.mutate(item.id)} />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Mic FAB */}
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

      <AddExpenseSheet visible={addSheetVisible} onClose={() => setAddSheetVisible(false)} onAdd={handleAddExpenses} defaultDate={selectedDate} />
      <VoiceSheet visible={voiceSheetVisible} mode="expenses" onClose={() => setVoiceSheetVisible(false)} onAddTasks={() => {}} onAddExpenses={handleAddExpenses} defaultDate={selectedDate} />
      <ScanSheet visible={scanSheetVisible} onClose={() => setScanSheetVisible(false)} onAddExpenses={handleAddExpenses} />
    </SafeAreaView>
  );
}
