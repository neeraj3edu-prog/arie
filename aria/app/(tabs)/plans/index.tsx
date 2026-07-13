import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { usePlans, usePlanDates } from '@/lib/hooks/usePlans';
import { WeekStrip } from '@/components/plans/WeekStrip';
import { PlanEventCard } from '@/components/plans/PlanEventCard';
import { PlanListCard } from '@/components/plans/PlanListCard';
import { AddPlanSheet } from '@/components/input/AddPlanSheet';
import { VoiceSheet } from '@/components/voice/VoiceSheet';
import { AIConsentSheet } from '@/components/consent/AIConsentSheet';
import { useAIConsent } from '@/lib/hooks/useAIConsent';
import { localDateISO } from '@/lib/utils/date';
import { getListItemCount } from '@/lib/db/plans';
import { useQuery } from '@tanstack/react-query';
import type { NewPlan, ParsedPlan } from '@/lib/types';

const ACCENT = '#a78bfa';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PLAN_PROMPTS = [
  '"Remind me about Jake\'s birthday on June 20th"',
  '"Dentist appointment July 5th at 2pm, notify 1 hour before"',
  '"Emma has piano every Wednesday at 4pm"',
  '"Add milk, eggs and bread to my grocery list for Saturday"',
];

type TabSegment = 'upcoming' | 'lists';

export default function PlansScreen() {
  const today = localDateISO();
  const [year, month] = today.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const [segment, setSegment] = useState<TabSegment>('upcoming');
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [consentSheetVisible, setConsentSheetVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const { events, lists, loading, addPlan, addPlanFromVoice, removePlan } = usePlans();
  const { hasConsent, grantConsent } = useAIConsent();

  // Week strip: get 7-day range centered on today
  const weekStart = localDateISO(new Date(year, month - 1, parseInt(today.split('-')[2]) - 3));
  const weekEnd = localDateISO(new Date(year, month - 1, parseInt(today.split('-')[2]) + 3));
  const { data: planDates } = usePlanDates(weekStart, weekEnd);
  const datesWithPlans = useMemo(() => new Set(planDates ?? []), [planDates]);

  // Load item counts for all lists
  const listCounts = useQuery({
    queryKey: ['list_item_counts', lists.map((l) => l.id).join(',')],
    queryFn: async () => {
      const counts: Record<string, { total: number; done: number }> = {};
      await Promise.all(lists.map(async (l) => { counts[l.id] = await getListItemCount(l.id); }));
      return counts;
    },
    enabled: lists.length > 0,
    staleTime: 30_000,
  });

  function requestAIFeature(action: () => void) {
    if (hasConsent) { action(); }
    else { setPendingAction(() => action); setConsentSheetVisible(true); }
  }

  async function handleConsentAllow() {
    await grantConsent();
    setConsentSheetVisible(false);
    pendingAction?.();
    setPendingAction(null);
  }

  function handleConsentDecline() { setConsentSheetVisible(false); setPendingAction(null); }

  function handleAddPlan(plan: NewPlan & { listItems?: string[] }) {
    addPlan.mutate(plan, {
      onError: () => Alert.alert('Error', 'Could not save plan. Please try again.'),
    });
  }

  function handleVoicePlans(plans: ParsedPlan[]) {
    plans.forEach((p) => addPlanFromVoice.mutate(p, {
      onError: () => Alert.alert('Error', 'Could not save plan from voice. Please try again.'),
    }));
  }

  function handleDeleteEvent(id: string, title: string) {
    Alert.alert('Delete Event', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePlan.mutate(id) },
    ]);
  }

  function handleDeleteList(id: string, title: string) {
    Alert.alert('Delete List', `Remove "${title}" and all its items?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePlan.mutate(id) },
    ]);
  }

  // Group events into "This Week" and "Upcoming"
  const weekEnd7 = localDateISO(new Date(year, month - 1, parseInt(today.split('-')[2]) + 6));
  const thisWeekEvents = events.filter((e) => e.date && e.date <= weekEnd7);
  const upcomingEvents = events.filter((e) => !e.date || e.date > weekEnd7);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <View>
            <Text style={{ color: '#f0f0f5', fontSize: 28, fontWeight: '700', lineHeight: 34 }}>Plans</Text>
            <Text style={{ color: '#8a8aa0', fontSize: 13, marginTop: 2 }}>{monthLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Pressable
              onPress={() => setAddSheetVisible(true)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}
              accessible accessibilityRole="button" accessibilityLabel="Add plan"
            >
              <Ionicons name="add" size={22} color="#f0f0f5" />
            </Pressable>
          </View>
        </View>

        {/* Week strip */}
        <WeekStrip datesWithPlans={datesWithPlans} accent={ACCENT} />

        {/* Segment toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, marginHorizontal: 16, marginBottom: 14, padding: 2 }}>
          {(['upcoming', 'lists'] as TabSegment[]).map((seg) => {
            const active = segment === seg;
            return (
              <Pressable
                key={seg}
                onPress={() => setSegment(seg)}
                style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: active ? ACCENT + '22' : 'transparent' }}
                accessible accessibilityRole="tab" accessibilityState={{ selected: active }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? ACCENT : '#5050a0' }}>
                  {seg === 'upcoming' ? 'Upcoming' : 'My Lists'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 32 }} />
        ) : segment === 'upcoming' ? (
          /* ── Upcoming events ── */
          events.length === 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', borderRadius: 16, padding: 20, backgroundColor: 'rgba(167,139,250,0.06)' }}>
                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>TRY SAYING...</Text>
                {PLAN_PROMPTS.map((p, i) => (
                  <Text key={i} style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 22, marginBottom: 4 }}>{p}</Text>
                ))}
                <Text style={{ color: '#4a4a60', fontSize: 12, marginTop: 12 }}>Or tap + to add an event manually</Text>
              </View>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {thisWeekEvents.length > 0 && (
                <>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#3a3a60', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>This Week</Text>
                  {thisWeekEvents.map((plan) => (
                    <PlanEventCard key={plan.id} plan={plan} onDelete={() => handleDeleteEvent(plan.id, plan.title)} />
                  ))}
                </>
              )}
              {upcomingEvents.length > 0 && (
                <>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#3a3a60', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: thisWeekEvents.length > 0 ? 8 : 0, marginBottom: 2 }}>Upcoming</Text>
                  {upcomingEvents.map((plan) => (
                    <PlanEventCard key={plan.id} plan={plan} onDelete={() => handleDeleteEvent(plan.id, plan.title)} />
                  ))}
                </>
              )}
            </View>
          )
        ) : (
          /* ── My Lists ── */
          lists.length === 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', borderRadius: 16, padding: 20, backgroundColor: 'rgba(167,139,250,0.06)' }}>
                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>TRY SAYING...</Text>
                <Text style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 22, marginBottom: 4 }}>{'"Add milk, eggs and bread to my grocery list for Saturday"'}</Text>
                <Text style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 22, marginBottom: 4 }}>{'"Create a pharmacy list"'}</Text>
                <Text style={{ color: '#4a4a60', fontSize: 12, marginTop: 12 }}>Or tap + to create a list manually</Text>
              </View>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {lists.map((plan) => {
                const counts = listCounts.data?.[plan.id] ?? { total: 0, done: 0 };
                return (
                  <PlanListCard
                    key={plan.id}
                    plan={plan}
                    totalItems={counts.total}
                    doneItems={counts.done}
                    onPress={() => router.push(`/(tabs)/plans/${plan.id}` as never)}
                    onDelete={() => handleDeleteList(plan.id, plan.title)}
                  />
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      <AIConsentSheet
        visible={consentSheetVisible}
        onAllow={handleConsentAllow}
        onDecline={handleConsentDecline}
      />

      {/* Voice FAB */}
      <Pressable
        onPress={() => requestAIFeature(() => setVoiceSheetVisible(true))}
        style={{
          position: 'absolute', bottom: 16,
          alignSelf: 'center', left: '50%', marginLeft: -32,
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: ACCENT,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: ACCENT, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
        accessible accessibilityRole="button" accessibilityLabel="Add plan by voice"
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </Pressable>

      <AddPlanSheet visible={addSheetVisible} onClose={() => setAddSheetVisible(false)} onAdd={handleAddPlan} />
      <VoiceSheet
        visible={voiceSheetVisible}
        mode="plans"
        onClose={() => setVoiceSheetVisible(false)}
        onAddTasks={() => {}}
        onAddExpenses={() => {}}
        onAddPlans={handleVoicePlans}
        defaultDate={today}
      />
    </SafeAreaView>
  );
}
