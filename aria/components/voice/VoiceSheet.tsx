import { View, Text, Pressable, Alert } from 'react-native';
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
        const parsed = await parseTasks(transcript);
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
            {phase === 'idle' && 'Tap the mic to start'}
            {phase === 'requesting' && 'Requesting microphone…'}
            {phase === 'recording' && 'Listening…'}
            {phase === 'processing' && 'Processing…'}
            {phase === 'success' && 'Done!'}
            {phase === 'error' && (error ?? 'Something went wrong')}
          </Text>

          {phase === 'idle' && (
            <Text style={{ color: '#4a4a60', fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
              {cfg.hint}
            </Text>
          )}
        </View>

        {/* Mic / Stop button pinned at bottom */}
        <View style={{ alignItems: 'center' }}>
          {!isProcessing && phase !== 'success' && (
            <Pressable
              onPress={isRecording ? stop : start}
              style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: isRecording ? '#ff453a' : cfg.color }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
              accessibilityLiveRegion="assertive"
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={36} color="#fff" />
            </Pressable>
          )}

          {isProcessing && (
            <View style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.color + '33' }}>
              <Ionicons name="hourglass-outline" size={32} color={cfg.color} />
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
}
