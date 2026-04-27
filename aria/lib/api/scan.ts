import { Platform } from 'react-native';
import { apiPost } from './client';

type ScanResult = {
  storeName?: string;
  receiptDate?: string;
  lineItems: { description: string; amountCents: number }[];
};

export async function scanDocument(imageUri: string): Promise<ScanResult> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // On web, imageUri is a blob: URL — fetch it to get the real Blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append('image', blob, 'receipt.jpg');
  } else {
    formData.append('image', {
      uri: imageUri,
      name: 'receipt.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  const res = await apiPost('document-scan', formData);
  return res.json() as Promise<ScanResult>;
}
