import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Ionicons } from '@expo/vector-icons';
import { localDateISO } from '@/lib/utils/date';
import type { NewPlan, PlanSubtype, PlanRecurrence, PlanNotifyOffset, PlanType } from '@/lib/types';

const ACCENT = '#a78bfa';

const SUBTYPE_PILLS: Array<{ key: PlanSubtype; label: string; emoji: string }> = [
  { key: 'birthday', label: 'Birthday', emoji: '🎂' },
  { key: 'appointment', label: 'Appointment', emoji: '🏥' },
  { key: 'class', label: 'Class', emoji: '📚' },
  { key: 'other', label: 'Other', emoji: '📅' },
];

const RECURRENCE_OPTIONS: Array<{ key: PlanRecurrence; label: string }> = [
  { key: 'none', label: 'Does not repeat' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const NOTIFY_CHIPS: Array<{ key: PlanNotifyOffset; label: string }> = [
  { key: 'day_before', label: 'Day before' },
  { key: 'morning_of', label: 'Morning of' },
  { key: '1_hour_before', label: '1 hr before' },
  { key: 'none', label: 'None' },
];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

function addDaysToISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return localDateISO(date);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

type AddPlanSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (plan: NewPlan & { listItems?: string[] }) => void;
};

export function AddPlanSheet({ visible, onClose, onAdd }: AddPlanSheetProps) {
  const today = localDateISO();
  const [planType, setPlanType] = useState<PlanType>('event');
  const [title, setTitle] = useState('');
  const [subtype, setSubtype] = useState<PlanSubtype>('other');
  const [selectedDate, setSelectedDate] = useState(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [time, setTime] = useState('');
  const [recurrence, setRecurrence] = useState<PlanRecurrence>('none');
  const [notifyOffset, setNotifyOffset] = useState<PlanNotifyOffset>('none');
  const [notes, setNotes] = useState('');

  function handleClose() {
    setPlanType('event');
    setTitle('');
    setSubtype('other');
    setSelectedDate(today);
    setShowCalendar(false);
    setCalYear(new Date().getFullYear());
    setCalMonth(new Date().getMonth() + 1);
    setTime('');
    setRecurrence('none');
    setNotifyOffset('none');
    setNotes('');
    onClose();
  }

  const handleSave = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Title required', 'Please enter a title for this plan.');
      return;
    }
    onAdd({
      type: planType,
      subtype: planType === 'event' ? subtype : 'other',
      title: trimmed,
      date: selectedDate,
      time: time.trim() || null,
      recurrence,
      notifyOffset,
      notes: notes.trim() || null,
    });
    handleClose();
  }, [title, planType, subtype, selectedDate, time, recurrence, notifyOffset, notes, onAdd, handleClose]);

  // Auto-select sensible defaults for subtype
  function handleSubtype(s: PlanSubtype) {
    setSubtype(s);
    if (s === 'birthday') { setRecurrence('yearly'); setNotifyOffset('day_before'); }
    else if (s === 'appointment') { setRecurrence('none'); setNotifyOffset('1_hour_before'); }
    else if (s === 'class') { setRecurrence('weekly'); setNotifyOffset('morning_of'); }
    else { setRecurrence('none'); setNotifyOffset('none'); }
  }

  // Mini calendar renderer
  function renderCalendar() {
    const numDays = daysInMonth(calYear, calMonth);
    const firstDay = firstDayOfMonth(calYear, calMonth);
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= numDays; d++) cells.push(d);

    const [selY, selM, selD] = selectedDate.split('-').map(Number);
    const isCurrentMonth = selY === calYear && selM === calMonth;

    return (
      <View style={{ marginTop: 8 }}>
        {/* Month nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Pressable
            onPress={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible accessibilityRole="button" accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color="#8a8aa0" />
          </Pressable>
          <Text style={{ color: '#f0f0f5', fontSize: 14, fontWeight: '600' }}>{MONTHS_FULL[calMonth - 1]} {calYear}</Text>
          <Pressable
            onPress={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible accessibilityRole="button" accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color="#8a8aa0" />
          </Pressable>
        </View>
        {/* Day labels */}
        <View style={{ flexDirection: 'row' }}>
          {['S','M','T','W','T','F','S'].map((l, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#4a4a60', fontWeight: '600' }}>{l}</Text>
            </View>
          ))}
        </View>
        {/* Day grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`e${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
            const iso = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isSel = isCurrentMonth && day === selD;
            const isTdy = iso === today;
            return (
              <Pressable
                key={iso}
                onPress={() => { setSelectedDate(iso); setShowCalendar(false); }}
                style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                accessible accessibilityRole="button" accessibilityLabel={iso} accessibilityState={{ selected: isSel }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? ACCENT : isTdy ? ACCENT + '28' : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: isSel || isTdy ? '700' : '400', color: isSel ? '#fff' : isTdy ? ACCENT : '#c0c0e0' }}>{day}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const showTimeField = planType === 'event' && (subtype === 'appointment' || subtype === 'class');

  return (
    <Sheet visible={visible} onClose={handleClose} snapHeight={620}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#f0f0f5', fontSize: 17, fontWeight: '700' }}>New Plan</Text>
          <Pressable onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessible accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#8a8aa0" />
          </Pressable>
        </View>

        {/* Type toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 2, marginBottom: 16 }}>
          {(['event', 'list'] as PlanType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setPlanType(t)}
              style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: planType === t ? ACCENT + '22' : 'transparent' }}
              accessible accessibilityRole="radio" accessibilityState={{ checked: planType === t }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: planType === t ? ACCENT : '#5050a0' }}>
                {t === 'event' ? '📅 Event' : '📋 List'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Subtype pills — events only */}
        {planType === 'event' && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#5050a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {SUBTYPE_PILLS.map(({ key, label, emoji }) => {
                const active = subtype === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleSubtype(key)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: active ? ACCENT + '60' : 'rgba(255,255,255,0.07)', backgroundColor: active ? ACCENT + '20' : '#12121e' }}
                    accessible accessibilityRole="radio" accessibilityState={{ checked: active }}
                  >
                    <Text style={{ fontSize: 12 }}>{emoji}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: active ? ACCENT : '#6060a0' }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Title */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#5050a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={planType === 'event' ? "e.g. Jake's Birthday" : "e.g. Grocery List"}
          placeholderTextColor="#3a3a60"
          style={{ backgroundColor: '#12121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#f0f0f5', marginBottom: 14 }}
          autoFocus
          returnKeyType="done"
          accessible
          accessibilityLabel="Title, required"
        />

        {/* Date */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#5050a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Date</Text>
        <Pressable
          onPress={() => setShowCalendar((v) => !v)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#12121e', borderWidth: 1, borderColor: showCalendar ? ACCENT + '60' : 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: showCalendar ? 0 : 14 }}
          accessible accessibilityRole="button" accessibilityLabel={`Date: ${isoToDisplay(selectedDate)}, tap to change`}
        >
          <Text style={{ fontSize: 14, color: '#f0f0f5' }}>{isoToDisplay(selectedDate)}</Text>
          <Ionicons name={showCalendar ? 'chevron-up' : 'calendar-outline'} size={16} color="#5050a0" />
        </Pressable>

        {showCalendar && (
          <View style={{ backgroundColor: '#12121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            {renderCalendar()}
          </View>
        )}

        {/* Time — only for appointments/classes */}
        {showTimeField && (
          <>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#5050a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Time (optional)</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="e.g. 14:00"
              placeholderTextColor="#3a3a60"
              style={{ backgroundColor: '#12121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#f0f0f5', marginBottom: 14 }}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              accessible
              accessibilityLabel="Time (optional), format HH:MM"
            />
          </>
        )}

        {/* Repeats */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#5050a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Repeats</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#12121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14 }}>
          <Pressable
            onPress={() => {
              const idx = RECURRENCE_OPTIONS.findIndex((r) => r.key === recurrence);
              setRecurrence(RECURRENCE_OPTIONS[(idx - 1 + RECURRENCE_OPTIONS.length) % RECURRENCE_OPTIONS.length].key);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
          >
            <Ionicons name="chevron-back" size={16} color="#5050a0" />
          </Pressable>
          <Text style={{ fontSize: 13, color: '#e0e0ff', fontWeight: '500' }}>
            {RECURRENCE_OPTIONS.find((r) => r.key === recurrence)?.label}
          </Text>
          <Pressable
            onPress={() => {
              const idx = RECURRENCE_OPTIONS.findIndex((r) => r.key === recurrence);
              setRecurrence(RECURRENCE_OPTIONS[(idx + 1) % RECURRENCE_OPTIONS.length].key);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
          >
            <Ionicons name="chevron-forward" size={16} color="#5050a0" />
          </Pressable>
        </View>

        {/* Notify */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#5050a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Notify me</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {NOTIFY_CHIPS.map(({ key, label }) => {
            const active = notifyOffset === key;
            return (
              <Pressable
                key={key}
                onPress={() => setNotifyOffset(key)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: active ? ACCENT + '50' : 'rgba(255,255,255,0.07)', backgroundColor: active ? ACCENT + '18' : '#12121e' }}
                accessible accessibilityRole="radio" accessibilityState={{ checked: active }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: active ? ACCENT : '#5050a0' }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notes — optional, events only */}
        {planType === 'event' && (
          <>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#5050a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note…"
              placeholderTextColor="#3a3a60"
              multiline
              style={{ backgroundColor: '#12121e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#f0f0f5', minHeight: 68, textAlignVertical: 'top', marginBottom: 14 }}
              accessible
              accessibilityLabel="Notes (optional)"
            />
          </>
        )}

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={{ backgroundColor: title.trim() ? ACCENT : ACCENT + '55', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Save ${planType === 'event' ? 'event' : 'list'}`}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {planType === 'event' ? 'Save Event' : 'Save List'}
          </Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}
