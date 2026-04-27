import { apiPost } from './client';

type ScanResult = {
  storeName?: string;
  receiptDate?: string;
  lineItems: { description: string; amountCents: number }[];
};

export async function scanDocument(imageUri: string): Promise<ScanResult> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'receipt.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const res = await apiPost('document-scan', formData);
  return res.json() as Promise<ScanResult>;
}
