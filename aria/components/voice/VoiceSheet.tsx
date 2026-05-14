import { View, Text, Pressable, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Waveform } from './Waveform';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';
import { parseTasks, parseExpenses } from '@/lib/api/parse';
import type { VoiceMode, ParsedExpense, NewExpense } from '@/lib/types';

type VoiceSheetProps = {
  visible: boolean;
  mode: VoiceMode;
  onClose: () => void;
  onAddTasks: (texts: string[]) => void;
  onAddExpenses: (expenses: NewExpense[]) => void;
  defaultDate: string;
  defaultCurrency?: string;
};

const MODE_CONFIG = {
  tasks: {
    label: 'Speak your tasks',
    hint: '"Pick up groceries, call dentist, finish report"',
    color: '#4f6ef7',
  },
  expenses: {
    label: 'Speak your expenses',
    hint: '"Coffee $4.50 at Starbucks, taxi $12"',
    color: '#f7a24f',
  },
} as const;

export function VoiceSheet({
  visible,
  mode,
  onClose,
  onAddTasks,
  onAddExpenses,
  defaultDate,
  defaultCurrency = 'USD',
}: VoiceSheetProps) {
  const cfg = MODE_CONFIG[mode];

  async function handleTranscript(transcript: string) {
    try {
      if (mode === 'tasks') {
        if (__DEV__) console.log('[VoiceSheet] transcript:', transcript);
        const parsed = await parseTasks(transcript);
        if (__DEV__) console.log('[VoiceSheet] parsed tasks:', parsed);
        if (parsed.length > 0) {
          onAddTasks(parsed.map((p) => p.text));
        } else {
          Alert.alert('No tasks found', `We heard: "${transcript}"\nTry speaking more clearly.`);
        }
      } else {
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
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process voice input';
      const isNotDeployed = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('404');
      Alert.alert(
        isNotDeployed ? 'Edge Function Not Deployed' : 'Error',
        isNotDeployed
          ? 'The voice transcription service isn\'t deployed yet.\n\nRun:\n  supabase functions deploy voice-transcribe\n  supabase functions deploy ai-parse'
          : msg
      );
    }
  }

  const { phase, error, start, stop, reset } = useVoiceRecorder(handleTranscript);
  const autoStarted = useRef(false);

  // Auto-start recording as soon as the sheet is visible
  useEffect(() => {
    if (visible && phase === 'idle' && !autoStarted.current) {
      autoStarted.current = true;
      start();
    }
    if (!visible) {
      autoStarted.current = false;
    }
  }, [visible, phase, start]);

  // Auto-close after success
  useEffect(() => {
    if (phase === 'success') {
      const t = setTimeout(() => {
        reset();
        onClose();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [phase, reset, onClose]);

  function handleClose() {
    reset();
    onClose();
  }

  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';

  return (
    <Sheet visible={visible} onClose={handleClose} snapHeight={380}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
          <Text style={{ color: '#f0f0f5', fontSize: 18, fontWeight: '700' }}>{cfg.label}</Text>
          <Pressable
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close voice recorder"
          >
            <Ionicons name="close" size={22} color="#8a8aa0" />
          </Pressable>
        </View>

        {/* Center area — waveform + status */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ marginBottom: 20 }}>
            <Waveform active={isRecording} color={cfg.color} />
          </View>

          <Text style={{ color: '#8a8aa0', fontSize: 14, textAlign: 'center', marginBottom: 6 }}>
            {(phase === 'idle' || phase === 'requesting') && 'Starting…'}
            {phase === 'recording' && 'Listening… tap to stop'}
            {phase === 'processing' && 'Processing…'}
            {phase === 'success' && 'Added!'}
            {phase === 'error' && (error ?? 'Something went wrong')}
          </Text>

          {phase === 'recording' && (
            <Text style={{ color: '#4a4a60', fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
              {cfg.hint}
            </Text>
          )}
        </View>

        {/* Button pinned at bottom */}
        <View style={{ alignItems: 'center' }}>
          {/* Recording — show stop button */}
          {isRecording && (
            <Pressable
              onPress={stop}
              style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff453a' }}
              accessible accessibilityRole="button" accessibilityLabel="Stop recording"
            >
              <Ionicons name="stop" size={36} color="#fff" />
            </Pressable>
          )}

          {/* Starting / requesting — disabled mic */}
          {(phase === 'idle' || phase === 'requesting') && (
            <View style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.color + '66' }}>
              <Ionicons name="mic" size={36} color="#fff" />
            </View>
          )}

          {/* Processing */}
          {isProcessing && (
            <View style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.color + '33' }}>
              <Ionicons name="hourglass-outline" size={32} color={cfg.color} />
            </View>
          )}

          {/* Success */}
          {phase === 'success' && (
            <View style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#34c759' }}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
          )}

          {/* Error — tap mic to retry */}
          {phase === 'error' && (
            <Pressable
              onPress={() => { reset(); start(); }}
              style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.color }}
              accessible accessibilityRole="button" accessibilityLabel="Retry recording"
            >
              <Ionicons name="mic" size={36} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Sheet>
  );
}
