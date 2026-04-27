import type { ParsedExpense, ParsedTask } from '../types';
import { apiPost } from './client';

export async function parseTasks(transcript: string): Promise<ParsedTask[]> {
  const res = await apiPost('ai-parse', { mode: 'tasks', transcript });
  const { tasks } = await res.json() as { tasks: string[] };
  return (tasks ?? []).map((text) => ({ text }));
}

export async function parseExpenses(transcript: string): Promise<ParsedExpense[]> {
  const res = await apiPost('ai-parse', { mode: 'expenses', transcript });
  const { expenses } = await res.json() as { expenses: ParsedExpense[] };
  return expenses ?? [];
}

export async function parseScannedItems(
  lineItems: { description: string; amountCents: number }[]
): Promise<ParsedExpense[]> {
  const res = await apiPost('ai-parse', { mode: 'scan', lineItems });
  const { expenses } = await res.json() as { expenses: ParsedExpense[] };
  return expenses ?? [];
}
