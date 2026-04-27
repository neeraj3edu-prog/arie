import { Audio } from 'expo-av';
import { useRef, useState, useCallback } from 'react';
import { transcribeAudio } from '../api/transcribe';
import type { VoicePhase } from '../types';

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

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      setError('Microphone permission denied');
      setPhase('error');
      return;
    }

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
