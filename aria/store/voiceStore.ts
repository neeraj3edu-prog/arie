import { create } from 'zustand';
import type { VoiceMode, VoicePhase } from '@/lib/types';

type VoiceStore = {
  phase: VoicePhase;
  mode: VoiceMode;
  error: string | undefined;
  transcript: string | undefined;
  setPhase: (phase: VoicePhase) => void;
  setMode: (mode: VoiceMode) => void;
  setError: (msg: string) => void;
  setTranscript: (text: string) => void;
  reset: () => void;
};

export const useVoiceStore = create<VoiceStore>((set) => ({
  phase: 'idle',
  mode: 'tasks',
  error: undefined,
  transcript: undefined,

  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),
  setError: (error) => set({ error, phase: 'error' }),
  setTranscript: (transcript) => set({ transcript }),
  reset: () => set({ phase: 'idle', error: undefined, transcript: undefined }),
}));
