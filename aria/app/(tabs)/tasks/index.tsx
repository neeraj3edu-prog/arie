import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTasks } from '@/lib/hooks/useTasks';
import { useCalendar } from '@/lib/hooks/useCalendar';
import { useExpensesForMonth } from '@/lib/hooks/useExpenses';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { TaskItem } from '@/components/tasks/TaskItem';
import { AddTaskSheet } from '@/components/input/AddTaskSheet';
import { VoiceSheet } from '@/components/voice/VoiceSheet';
import { isToday } from '@/lib/utils/date';
import type { NewExpense } from '@/lib/types';

const ACCENT = '#4f6ef7';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TASK_PROMPTS = [
  '"Buy groceries, call dentist, finish report"',
  '"Morning run, team meeting at 10, pick up kids"',
  '"Pay bills, review pull requests, water plants"',
];

export default function TasksScreen() {
  const { selectedDate, activeMonth, setSelectedDate, goToPrevMonth, goToNextMonth, goToToday } = useCalendar();
  const { tasks, overdueTasks, loading, addTasks, toggleTask, removeTask, moveToToday } = useTasks(selectedDate);
  const [showOverdue, setShowOverdue] = useState(true);
  const { data: monthExpenses = [] } = useExpensesForMonth(activeMonth);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);

  const datesWithTasks = new Set(tasks.map((t) => t.scheduledDate));
  const datesWithExpenses = new Set(monthExpenses.map((e) => e.date));

  const [year, month] = activeMonth.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const sectionLabel = isToday(selectedDate)
    ? 'Today'
    : new Date(...(selectedDate.split('-').map(Number) as [number, number, number])).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
            <Text style={{ color: '#f0f0f5', fontSize: 28, fontWeight: '700', lineHeight: 34 }}>Tasks</Text>
            <Text style={{ color: '#8a8aa0', fontSize: 13, marginTop: 2 }}>{monthLabel}</Text>
          </View>
          <Pressable onPress={() => setAddSheetVisible(true)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
            accessible accessibilityRole="button" accessibilityLabel="Add task">
            <Ionicons name="add" size={22} color="#f0f0f5" />
          </Pressable>
        </View>

        {/* Calendar */}
        <MonthCalendar
          activeMonth={activeMonth} selectedDate={selectedDate}
          onSelectDate={setSelectedDate} onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth} onToday={goToToday}
          accentColor={ACCENT} datesWithTasks={datesWithTasks} datesWithExpenses={datesWithExpenses}
        />

        {/* Overdue tasks from previous days */}
        {overdueTasks.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <Pressable
              onPress={() => setShowOverdue((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}
            >
              <Ionicons name="time-outline" size={14} color="#f7a24f" />
              <Text style={{ color: '#f7a24f', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
                {overdueTasks.length} OVERDUE FROM PREVIOUS DAYS
              </Text>
              <Ionicons name={showOverdue ? 'chevron-up' : 'chevron-down'} size={14} color="#f7a24f" />
            </Pressable>

            {showOverdue && (
              <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(247,162,79,0.2)', backgroundColor: 'rgba(247,162,79,0.04)' }}>
                {overdueTasks.map((task, index) => {
                  const [y, m, d] = task.scheduledDate.split('-').map(Number);
                  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  const dateLabel = `${MONTHS[m - 1]} ${d}`;
                  return (
                    <View key={task.id}>
                      {index > 0 && <View style={{ height: 1, backgroundColor: 'rgba(247,162,79,0.15)' }} />}
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 }}>
                        <Pressable
                          onPress={() => toggleTask.mutate(task.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ marginRight: 10 }}
                        >
                          <Ionicons name="square-outline" size={22} color="#4a4a60" />
                        </Pressable>
                        <Text style={{ flex: 1, fontSize: 14, color: '#6a6a80', textDecorationLine: 'none' }} numberOfLines={1}>
                          {task.text}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ backgroundColor: 'rgba(247,162,79,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: '#f7a24f', fontSize: 11, fontWeight: '600' }}>{dateLabel}</Text>
                          </View>
                          <Pressable
                            onPress={() => moveToToday.mutate(task.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                            accessible accessibilityLabel="Move to today"
                          >
                            <Ionicons name="arrow-forward-circle-outline" size={20} color="#4f6ef7" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Section header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ color: '#f0f0f5', fontSize: 18, fontWeight: '700' }}>{sectionLabel}</Text>
        </View>

        {/* Task list — rendered inline, no nested ScrollView */}
        {loading ? (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 32 }} />
        ) : tasks.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ borderWidth: 1, borderColor: 'rgba(79,110,247,0.3)', borderRadius: 16, padding: 20, backgroundColor: 'rgba(79,110,247,0.06)' }}>
              <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>TRY SAYING...</Text>
              {TASK_PROMPTS.map((p, i) => (
                <Text key={i} style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 22, marginBottom: 4 }}>{p}</Text>
              ))}
              <Text style={{ color: '#4a4a60', fontSize: 12, marginTop: 12 }}>Or tap + to type tasks manually</Text>
            </View>
          </View>
        ) : (
          <View>
            {tasks.map((task, index) => (
              <View key={task.id}>
                {index > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16 }} />}
                <TaskItem
                  task={task}
                  onToggle={() => toggleTask.mutate(task.id)}
                  onDelete={() => removeTask.mutate(task.id)}
                />
              </View>
            ))}
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
        accessible accessibilityRole="button" accessibilityLabel="Add tasks by voice"
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </Pressable>

      <AddTaskSheet visible={addSheetVisible} onClose={() => setAddSheetVisible(false)} onAdd={(texts) => addTasks.mutate(texts)} defaultDate={selectedDate} />
      <VoiceSheet visible={voiceSheetVisible} mode="tasks" onClose={() => setVoiceSheetVisible(false)} onAddTasks={(texts) => addTasks.mutate(texts)} onAddExpenses={(_: NewExpense[]) => {}} defaultDate={selectedDate} />
    </SafeAreaView>
  );
}
