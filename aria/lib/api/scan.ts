import { Platform } from 'react-native';
import { apiPost } from './client';

type ScanResult = {
  storeName?: string;
  receiptDate?: string;
  lineItems: { description: string; amountCents: number }[];
};

async function uriToBlob(uri: string): Promise<Blob> {
  // data: URL — convert base64 to Blob directly
  if (uri.startsWith('data:')) {
    const [header, base64] = uri.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  }

  // blob: URL — fetch it
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Image read failed (${response.status})`);
  return response.blob();
}

export async function scanDocument(imageUri: string): Promise<ScanResult> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const blob = await uriToBlob(imageUri);
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
