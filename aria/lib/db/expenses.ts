import type { Expense, NewExpense } from '../types';
import { getDb } from './client';

type ExpenseRow = {
  id: string;
  server_id: string | null;
  item: string;
  amount: number;
  currency: string;
  category: string;
  store: string | null;
  date: string;
  receipt_scan: number;
  created_at: string;
  synced: number;
};

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    serverId: row.server_id,
    item: row.item,
    amount: row.amount,
    currency: row.currency,
    category: row.category as Expense['category'],
    store: row.store,
    date: row.date,
    receiptScan: row.receipt_scan === 1,
    createdAt: row.created_at,
    synced: row.synced === 1,
  };
}

export async function getExpensesForDate(date: string): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(
    'SELECT * FROM expenses_local WHERE date = ? ORDER BY created_at ASC',
    [date]
  );
  return rows.map(rowToExpense);
}

export async function getExpensesForMonth(monthPrefix: string): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(
    "SELECT * FROM expenses_local WHERE date LIKE ? ORDER BY date ASC, created_at ASC",
    [`${monthPrefix}%`]
  );
  return rows.map(rowToExpense);
}

export async function insertExpense(
  expense: NewExpense & { id: string }
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO expenses_local (id, item, amount, currency, category, store, date, receipt_scan, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      expense.id,
      expense.item,
      expense.amount,
      expense.currency,
      expense.category,
      expense.store ?? null,
      expense.date,
      expense.receiptScan ? 1 : 0,
      now,
    ]
  );
}

export async function insertExpensesBatch(
  expenses: (NewExpense & { id: string })[]
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const e of expenses) {
      await db.runAsync(
        `INSERT OR IGNORE INTO expenses_local (id, item, amount, currency, category, store, date, receipt_scan, created_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [e.id, e.item, e.amount, e.currency, e.category, e.store ?? null, e.date, e.receiptScan ? 1 : 0, now]
      );
    }
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses_local WHERE id = ?', [id]);
}

export async function getMonthlyTotal(monthPrefix: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses_local WHERE date LIKE ?",
    [`${monthPrefix}%`]
  );
  return row?.total ?? 0;
}
