import { View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { scanDocument } from '@/lib/api/scan';
import { parseScannedItems } from '@/lib/api/parse';
import { localDateISO } from '@/lib/utils/date';
import type { NewExpense } from '@/lib/types';

type ScanSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAddExpenses: (expenses: NewExpense[]) => void;
  defaultCurrency?: string;
};

type ScanPhase = 'pick' | 'scanning' | 'done' | 'error';

export function ScanSheet({ visible, onClose, onAddExpenses, defaultCurrency = 'USD' }: ScanSheetProps) {
  const [phase, setPhase] = useState<ScanPhase>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setPhase('pick');
    setImageUri(null);
    setError(null);
    onClose();
  }

  async function pickImage(fromCamera: boolean) {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission required', fromCamera ? 'Camera access is needed.' : 'Photo library access is needed.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    await processImage(uri);
  }

  async function processImage(uri: string) {
    setPhase('scanning');
    setError(null);
    try {
      const { storeName, receiptDate, lineItems } = await scanDocument(uri);
      const parsed = await parseScannedItems(lineItems);
      const date = receiptDate ?? localDateISO();

      const expenses: NewExpense[] = parsed.map((p) => ({
        item: p.item,
        amount: p.amount,
        currency: defaultCurrency,
        category: p.category,
        store: p.store ?? storeName ?? null,
        date,
        receiptScan: true,
      }));

      onAddExpenses(expenses);
      setPhase('done');
      setTimeout(handleClose, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPhase('error');
      console.error('[ScanSheet]', msg);
    }
  }

  return (
    <Sheet visible={visible} onClose={handleClose} snapHeight={400}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Text style={{ color: '#f0f0f5', fontSize: 18, fontWeight: '700' }}>Scan receipt</Text>
          <Pressable onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#8a8aa0" />
          </Pressable>
        </View>

        {phase === 'pick' && (
          <View style={{ gap: 12 }}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
            )}
            <Button label="Take a photo" onPress={() => pickImage(true)} variant="primary" accessibilityHint="Opens camera to photograph a receipt" />
            <Button label="Choose from library" onPress={() => pickImage(false)} variant="secondary" accessibilityHint="Opens photo library to select a receipt" />
          </View>
        )}

        {phase === 'scanning' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <ActivityIndicator size="large" color="#f7a24f" />
            <Text style={{ color: '#8a8aa0', fontSize: 14 }}>Scanning receipt…</Text>
          </View>
        )}

        {phase === 'done' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Ionicons name="checkmark-circle" size={52} color="#34c759" />
            <Text style={{ color: '#f0f0f5', fontSize: 16, fontWeight: '600' }}>Expenses added!</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Ionicons name="alert-circle-outline" size={48} color="#ff453a" />
            <Text style={{ color: '#ff453a', fontSize: 14, textAlign: 'center' }}>{error}</Text>
            <Button label="Try again" onPress={() => setPhase('pick')} variant="secondary" />
          </View>
        )}
      </View>
    </Sheet>
  );
}
