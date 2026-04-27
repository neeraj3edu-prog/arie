export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function parseDollarsToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return Math.round(parseFloat(cleaned || '0') * 100);
}
