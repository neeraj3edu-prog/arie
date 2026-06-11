import { Audio } from 'expo-av';
import { useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { transcribeAudio } from '../api/transcribe';
import type { VoicePhase } from '../types';

// expo-av rejects createAsync if AppState isn't 'active'. After the iOS permission
// dialog the app briefly goes inactive, so we wait until it returns before proceeding.
function waitForActive(timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (AppState.currentState === 'active') { resolve(); return; }
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; sub.remove(); resolve(); } }, timeoutMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !done) { done = true; clearTimeout(timer); sub.remove(); resolve(); }
    });
  });
}

type UseVoiceRecorderResult = {
  phase: VoicePhase;
  error: string | undefined;
  durationMs: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
};

export function useVoiceRecorder(
  onTranscript: (text: string) => void
): UseVoiceRecorderResult {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [error, setError] = useState<string | undefined>();
  const [durationMs, setDurationMs] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(async () => {
    setPhase('requesting');
    setError(undefined);

    try {
      // Check existing status first so we know if this is a first-time grant
      const { status: existingStatus } = await Audio.getPermissionsAsync();
      const isFirstGrant = existingStatus !== 'granted';

      const { status } = isFirstGrant
        ? await Audio.requestPermissionsAsync()
        : { status: existingStatus };

      if (status !== 'granted') {
        setError('Microphone permission denied');
        setPhase('error');
        return;
      }

      // The permission dialog (and sometimes the sheet animation) briefly backgrounds
      // the app — expo-av rejects createAsync unless AppState is 'active'.
      await waitForActive();
      // Extra settle time after first-time grant so iOS can fully reinitialize the audio session.
      if (isFirstGrant) {
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
      }

      // Reset audio session first — clears stale background state (e.g. after returning from Safari OAuth)
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setPhase('recording');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(msg);
      setPhase('error');
    }
  }, []);

  const stop = useCallback(async () => {
    if (!recordingRef.current) return;
    setPhase('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const uri = recordingRef.current.getURI()!; // URI is guaranteed after stopAndUnloadAsync
      setDurationMs(Date.now() - startTimeRef.current);
      recordingRef.current = null;

      const transcript = await transcribeAudio(uri);
      onTranscript(transcript);
      setPhase('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      const isNetworkError = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('404') || msg.includes('not found');
      setError(
        isNetworkError
          ? 'Voice service not deployed yet.\nRun: supabase functions deploy voice-transcribe'
          : msg
      );
      setPhase('error');
    } finally {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
  }, [onTranscript]);

  const reset = useCallback(() => {
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    recordingRef.current = null;
    setPhase('idle');
    setError(undefined);
    setDurationMs(0);
  }, []);

  return { phase, error, durationMs, start, stop, reset };
}
