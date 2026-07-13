import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useListItems } from '@/lib/hooks/usePlans';
import { useQuery } from '@tanstack/react-query';
import { getPlanById } from '@/lib/db/plans';
import { VoiceSheet } from '@/components/voice/VoiceSheet';
import { AIConsentSheet } from '@/components/consent/AIConsentSheet';
import { useAIConsent } from '@/lib/hooks/useAIConsent';
import { localDateISO } from '@/lib/utils/date';

const ACCENT = '#a78bfa';

const NOTIFY_LABEL: Record<string, string> = {
  day_before: 'Day before at 9:00 AM',
  morning_of: 'Morning of at 9:00 AM',
  '1_hour_before': '1 hour before',
  none: '',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ListDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [newItemText, setNewItemText] = useState('');
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [consentSheetVisible, setConsentSheetVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { hasConsent, grantConsent } = useAIConsent();

  const planQuery = useQuery({
    queryKey: ['plan', id],
    queryFn: () => getPlanById(id ?? ''),
    enabled: !!id,
    staleTime: 60_000,
  });
  const plan = planQuery.data;

  const { items, loading, addItem, addItems, toggleItem, removeItem, clearDone } = useListItems(id ?? '');

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

  function handleAddItem() {
    const text = newItemText.trim();
    if (!text) return;
    addItem.mutate(text, {
      onError: () => Alert.alert('Error', 'Could not add item.'),
    });
    setNewItemText('');
  }

  // For voice on list detail: parse as tasks and add as list items
  async function handleVoiceTranscriptAsItems(texts: string[]) {
    if (texts.length > 0) addItems.mutate(texts);
  }

  function handleClearDone() {
    const doneCount = items.filter((i) => i.done).length;
    if (doneCount === 0) return;
    Alert.alert('Clear Done', `Remove ${doneCount} completed item${doneCount !== 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearDone.mutate() },
    ]);
  }

  function handleDeleteItem(id: string, text: string) {
    Alert.alert('Remove Item', `Remove "${text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem.mutate(id) },
    ]);
  }

  if (!id || (!plan && !planQuery.isLoading)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#8a8aa0', fontSize: 15 }}>List not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: ACCENT, fontSize: 15 }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const hasNotif = plan && plan.notifyOffset !== 'none';

  let dateLabel = '';
  if (plan?.date) {
    const [, m, d] = plan.date.split('-').map(Number);
    dateLabel = `${MONTHS[m - 1]} ${d}`;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 8 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible accessibilityRole="button" accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={ACCENT} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#f0f0f5' }} numberOfLines={1}>
            {planQuery.isLoading ? '…' : plan?.title ?? ''}
          </Text>
        </View>

        {/* Notification banner */}
        {hasNotif && plan && (
          <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="notifications-outline" size={14} color={ACCENT} />
            <Text style={{ flex: 1, fontSize: 12, color: ACCENT }}>
              {dateLabel ? `Remind ${dateLabel} · ${NOTIFY_LABEL[plan.notifyOffset]}` : NOTIFY_LABEL[plan.notifyOffset]}
            </Text>
          </View>
        )}

        {/* Count + clear */}
        {totalCount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#3a3a60', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {doneCount} of {totalCount} done
            </Text>
            {doneCount > 0 && (
              <Pressable onPress={handleClearDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>Clear done</Text>
              </Pressable>
            )}
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 32 }} />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {items.length === 0 && (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ color: '#4a4a60', fontSize: 14 }}>No items yet — add one below or tap 🎙️</Text>
              </View>
            )}

            {items.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)' }} />}
                <Pressable
                  onPress={() => toggleItem.mutate(item.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 }}
                  accessible
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}
                  accessibilityLabel={item.text}
                >
                  <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: item.done ? '#34c759' : '#3a3a60',
                    backgroundColor: item.done ? '#34c759' : 'transparent',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {item.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, color: item.done ? '#3a3a60' : '#c0c0e0', textDecorationLine: item.done ? 'line-through' : 'none' }}>
                    {item.text}
                  </Text>
                  <Pressable
                    onPress={() => handleDeleteItem(item.id, item.text)}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 4 }}
                    accessible accessibilityRole="button" accessibilityLabel={`Remove ${item.text}`}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#3a3a60" />
                  </Pressable>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Add item row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, gap: 8, backgroundColor: '#12121e', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 12, paddingVertical: 8 }}>
          <Ionicons name="add" size={20} color={ACCENT} />
          <TextInput
            ref={inputRef}
            value={newItemText}
            onChangeText={setNewItemText}
            placeholder="Add item or tap 🎙️ to speak"
            placeholderTextColor="#4a4a60"
            style={{ flex: 1, fontSize: 14, color: '#f0f0f5' }}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
            accessible
            accessibilityLabel="New item text"
          />
          <Pressable
            onPress={() => requestAIFeature(() => setVoiceSheetVisible(true))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            accessible accessibilityRole="button" accessibilityLabel="Add items by voice"
          >
            <Text style={{ fontSize: 18 }}>🎙️</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AIConsentSheet
        visible={consentSheetVisible}
        onAllow={handleConsentAllow}
        onDecline={handleConsentDecline}
      />

      {/* Voice sheet for adding list items — reuses tasks parsing */}
      <VoiceSheet
        visible={voiceSheetVisible}
        mode="tasks"
        onClose={() => setVoiceSheetVisible(false)}
        onAddTasks={(texts) => handleVoiceTranscriptAsItems(texts)}
        onAddExpenses={() => {}}
        defaultDate={localDateISO()}
      />
    </SafeAreaView>
  );
}
