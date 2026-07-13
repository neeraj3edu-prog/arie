import { View, Text, Pressable, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Waveform } from './Waveform';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';
import { parseTasks, parseExpenses, parsePlans } from '@/lib/api/parse';
import { localDateISO } from '@/lib/utils/date';
import type { VoiceMode, ParsedExpense, ParsedPlan, NewExpense } from '@/lib/types';

type VoiceSheetProps = {
  visible: boolean;
  mode: VoiceMode;
  onClose: () => void;
  onAddTasks: (texts: string[]) => void;
  onAddExpenses: (expenses: NewExpense[]) => void;
  onAddPlans?: (plans: ParsedPlan[]) => void;
  defaultDate: string;
  defaultCurrency?: string;
};

const MODE_CONFIG = {
  tasks: {
    hint: '"Pick up groceries, call dentist, finish report"',
    color: '#4f6ef7',
  },
  expenses: {
    hint: '"Coffee $4.50 at Starbucks, taxi $12"',
    color: '#f7a24f',
  },
  plans: {
    hint: '"Remind me about Jake\'s birthday on June 20th"',
    color: '#a78bfa',
  },
} as const;

export function VoiceSheet({
  visible,
  mode,
  onClose,
  onAddTasks,
  onAddExpenses,
  onAddPlans,
  defaultDate,
  defaultCurrency = 'USD',
}: VoiceSheetProps) {
  const cfg = MODE_CONFIG[mode];
  const [lastTranscript, setLastTranscript] = useState('');

  async function handleTranscript(transcript: string) {
    setLastTranscript(transcript);
    try {
      if (mode === 'tasks') {
        const parsed = await parseTasks(transcript);
        if (parsed.length > 0) {
          onAddTasks(parsed.map((p) => p.text));
        } else {
          Alert.alert('No tasks found', `We heard: "${transcript}"\nTry speaking more clearly.`);
        }
      } else if (mode === 'expenses') {
        const parsed = await parseExpenses(transcript);
        if (parsed.length > 0) {
          const expenses: NewExpense[] = parsed.map((p: ParsedExpense) => ({
            item: p.item,
            amount: p.amount,
            currency: defaultCurrency,
            category: p.category,
            store: p.store ?? null,
            date: defaultDate,
            receiptScan: false,
          }));
          onAddExpenses(expenses);
        } else {
          Alert.alert('No expenses found', `We heard: "${transcript}"\nTry speaking more clearly.`);
        }
      } else {
        const today = localDateISO();
        const parsed = await parsePlans(transcript, today);
        if (parsed.length > 0 && onAddPlans) {
          onAddPlans(parsed);
        } else {
          Alert.alert('No plan found', `We heard: "${transcript}"\nTry saying something like "Remind me about Jake's birthday on June 20th".`);
        }
      }
      reset();
      setLastTranscript('');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process voice input';
      Alert.alert('Error', msg);
    }
  }

  const { phase, error, start, stop, reset } = useVoiceRecorder(handleTranscript);
  const autoStarted = useRef(false);

  // Auto-start once visible — 150ms lets the sheet animation finish first
  useEffect(() => {
    if (visible && phase === 'idle' && !autoStarted.current) {
      autoStarted.current = true;
      const t = setTimeout(() => start(), 150);
      return () => clearTimeout(t);
    }
    if (!visible) {
      autoStarted.current = false;
    }
  }, [visible, phase, start]);

  // Auto-close after success (safety net — handleTranscript normally closes first)
  useEffect(() => {
    if (phase === 'success') {
      const t = setTimeout(() => { reset(); setLastTranscript(''); onClose(); }, 1200);
      return () => clearTimeout(t);
    }
  }, [phase, reset, onClose]);

  function handleClose() {
    reset();
    setLastTranscript('');
    onClose();
  }

  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';
  const isStarting = phase === 'idle' || phase === 'requesting';

  return (
    <Sheet visible={visible} onClose={handleClose} snapHeight={380}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>

        {/* Waveform — center */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Waveform active={isRecording} color={cfg.color} />

          {/* Transcript / status text — matches Notie's live transcript area */}
          <View style={{ marginTop: 24, minHeight: 48, alignItems: 'center', paddingHorizontal: 8 }}>
            {isStarting && (
              <Text style={{ color: '#4a4a60', fontSize: 15, textAlign: 'center' }}>Starting…</Text>
            )}
            {isRecording && lastTranscript.length === 0 && (
              <Text style={{ color: '#8a8aa0', fontSize: 15, textAlign: 'center' }}>{cfg.hint}</Text>
            )}
            {isRecording && lastTranscript.length > 0 && (
              <Text style={{ color: '#f0f0f5', fontSize: 15, textAlign: 'center' }} numberOfLines={3}>
                {lastTranscript}
              </Text>
            )}
            {isProcessing && (
              <>
                <Text style={{ color: '#8a8aa0', fontSize: 13, textAlign: 'center', marginBottom: 6 }}>Analyzing…</Text>
                {lastTranscript.length > 0 && (
                  <Text style={{ color: '#4a4a60', fontSize: 13, textAlign: 'center' }} numberOfLines={3}>
                    "{lastTranscript}"
                  </Text>
                )}
              </>
            )}
            {phase === 'success' && (
              <Text style={{ color: '#34c759', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>Added!</Text>
            )}
            {phase === 'error' && (
              <Text style={{ color: '#ff453a', fontSize: 14, textAlign: 'center' }} numberOfLines={3}>
                {error ?? 'Something went wrong'}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom row: Cancel + action button — matches Notie layout */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          <Pressable
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessible accessibilityRole="button" accessibilityLabel="Cancel"
          >
            <Text style={{ color: '#8a8aa0', fontSize: 16 }}>Cancel</Text>
          </Pressable>

          {/* Stop button while recording */}
          {isRecording && (
            <Pressable
              onPress={stop}
              style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff453a' }}
              accessible accessibilityRole="button" accessibilityLabel="Stop recording"
            >
              <Ionicons name="stop" size={32} color="#fff" />
            </Pressable>
          )}

          {/* Dimmed mic while starting */}
          {isStarting && (
            <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.color + '55' }}>
              <Ionicons name="mic" size={32} color="#fff" />
            </View>
          )}

          {/* Hourglass while processing */}
          {isProcessing && (
            <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.color + '33' }}>
              <Ionicons name="hourglass-outline" size={28} color={cfg.color} />
            </View>
          )}

          {/* Green check on success */}
          {phase === 'success' && (
            <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#34c759' }}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
          )}

          {/* Retry on error */}
          {phase === 'error' && (
            <Pressable
              onPress={() => { reset(); setLastTranscript(''); start(); }}
              style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.color }}
              accessible accessibilityRole="button" accessibilityLabel="Retry"
            >
              <Ionicons name="mic" size={32} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Sheet>
  );
}
