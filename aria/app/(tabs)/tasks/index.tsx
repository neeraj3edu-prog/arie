import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTasks } from '@/lib/hooks/useTasks';
import { useCalendar } from '@/lib/hooks/useCalendar';
import { useExpensesForMonth } from '@/lib/hooks/useExpenses';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { TaskList } from '@/components/tasks/TaskList';
import { AddTaskSheet } from '@/components/input/AddTaskSheet';
import { VoiceSheet } from '@/components/voice/VoiceSheet';
import { isToday } from '@/lib/utils/date';
import type { NewExpense } from '@/lib/types';

const ACCENT = '#4f6ef7';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type DayView = 'day' | 'month';

export default function TasksScreen() {
  const {
    selectedDate, activeMonth, setSelectedDate,
    goToPrevMonth, goToNextMonth, goToToday,
  } = useCalendar();

  const { tasks, loading, addTasks, toggleTask, removeTask } = useTasks(selectedDate);
  const { data: monthExpenses = [] } = useExpensesForMonth(activeMonth);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [dayView, setDayView] = useState<DayView>('day');

  const datesWithTasks = new Set(tasks.map((t) => t.scheduledDate));
  const datesWithExpenses = new Set(monthExpenses.map((e) => e.date));

  const [year, month] = activeMonth.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const sectionLabel = (() => {
    if (isToday(selectedDate)) return 'Today';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <View>
          <Text style={{ color: '#f0f0f5', fontSize: 28, fontWeight: '700', lineHeight: 34 }}>Tasks</Text>
          <Text style={{ color: '#8a8aa0', fontSize: 13, marginTop: 2 }}>{monthLabel}</Text>
        </View>
        <Pressable
          onPress={() => setAddSheetVisible(true)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
          accessible accessibilityRole="button" accessibilityLabel="Add task"
        >
          <Ionicons name="add" size={22} color="#f0f0f5" />
        </Pressable>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ color: '#f0f0f5', fontSize: 18, fontWeight: '700' }}>{sectionLabel}</Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#13131a', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
          {(['day', 'month'] as DayView[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setDayView(v)}
              style={{
                paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6,
                backgroundColor: dayView === v ? ACCENT : 'transparent',
              }}
              accessible accessibilityRole="button" accessibilityLabel={v === 'day' ? 'Day view' : 'Month view'}
            >
              <Text style={{ color: dayView === v ? '#fff' : '#8a8aa0', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                {v === 'day' ? 'Day' : 'Month'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Task list */}
      {loading ? (
        <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 32 }} />
      ) : (
        <TaskList
          tasks={tasks}
          selectedDate={selectedDate}
          onToggle={(id) => toggleTask.mutate(id)}
          onDelete={(id) => removeTask.mutate(id)}
        />
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
        accessible accessibilityRole="button" accessibilityLabel="Add tasks by voice"
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </Pressable>

      <AddTaskSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onAdd={(texts) => addTasks.mutate(texts)}
        defaultDate={selectedDate}
      />

      <VoiceSheet
        visible={voiceSheetVisible}
        mode="tasks"
        onClose={() => setVoiceSheetVisible(false)}
        onAddTasks={(texts) => addTasks.mutate(texts)}
        onAddExpenses={(_: NewExpense[]) => {}}
        defaultDate={selectedDate}
      />
    </SafeAreaView>
  );
}
