import { Platform } from 'react-native';
import { apiPost } from './client';

export async function transcribeAudio(audioUri: string): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // On web, expo-av produces a blob: URL — fetch it to get a real Blob
    const response = await fetch(audioUri);
    const blob = await response.blob();
    // Browser MediaRecorder typically produces webm; Deepgram auto-detects format
    formData.append('audio', blob, 'recording.webm');
  } else {
    // On native, React Native FormData reads the file from the URI directly
    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
  }

  const res = await apiPost('voice-transcribe', formData);
  const { transcript } = await res.json() as { transcript: string };
  return transcript;
}
