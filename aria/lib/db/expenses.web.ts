// Web implementation of expense DB using localStorage.
// Metro resolves this file instead of expenses.ts on web platform.
import type { Expense, NewExpense } from '../types';
import { supabase } from '../supabase/client';

const STORE_KEY = 'aria:expenses';

function loadAll(): Expense[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as Expense[];
  } catch {
    return [];
  }
}

function saveAll(expenses: Expense[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(expenses));
}

function rowToExpense(row: Record<string, unknown>): Expense {
  return {
    id: (row['client_id'] as string | null) ?? (row['id'] as string),
    serverId: row['id'] as string,
    item: row['item'] as string,
    amount: row['amount'] as number,
    currency: row['currency'] as string,
    category: row['category'] as Expense['category'],
    store: (row['store'] as string | null) ?? null,
    date: row['date'] as string,
    receiptScan: row['receipt_scan'] as boolean,
    createdAt: row['created_at'] as string,
    synced: true,
  };
}

// On first load, pull from Supabase to populate localStorage.
async function bootstrap(filter: { date?: string; monthPrefix?: string }): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('created_at');
  if (filter.date) {
    query = query.eq('date', filter.date);
  } else if (filter.monthPrefix) {
    query = query
      .gte('date', `${filter.monthPrefix}-01`)
      .lte('date', `${filter.monthPrefix}-31`);
  }
  const { data } = await query;
  if (!data?.length) return [];
  const fetched = data.map(rowToExpense);
  const all = loadAll();
  const ids = new Set(all.map((e) => e.id));
  saveAll([...all, ...fetched.filter((e) => !ids.has(e.id))]);
  return fetched;
}

export async function getExpensesForDate(date: string): Promise<Expense[]> {
  const local = loadAll()
    .filter((e) => e.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (local.length > 0) return local;
  try {
    return await bootstrap({ date });
  } catch {
    return [];
  }
}

export async function getExpensesForMonth(monthPrefix: string): Promise<Expense[]> {
  const local = loadAll()
    .filter((e) => e.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  if (local.length > 0) return local;
  try {
    return await bootstrap({ monthPrefix });
  } catch {
    return [];
  }
}

export async function insertExpensesBatch(
  expenses: (NewExpense & { id: string; createdAt?: string })[]
): Promise<void> {
  const all = loadAll();
  const ids = new Set(all.map((e) => e.id));
  const now = new Date().toISOString();
  for (const e of expenses) {
    if (!ids.has(e.id)) {
      all.push({
        id: e.id,
        serverId: null,
        item: e.item,
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        store: e.store ?? null,
        date: e.date,
        receiptScan: e.receiptScan,
        createdAt: e.createdAt ?? now,
        synced: false,
      });
    }
  }
  saveAll(all);
}

export async function deleteExpense(id: string): Promise<void> {
  saveAll(loadAll().filter((e) => e.id !== id));
}

export async function getMonthlyTotal(monthPrefix: string): Promise<number> {
  return loadAll()
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce((s, e) => s + e.amount, 0);
}

// insertExpense kept for API parity
export async function insertExpense(expense: NewExpense & { id: string }): Promise<void> {
  await insertExpensesBatch([expense]);
}
