import { supabase } from '../supabase/client';
import { getDb } from '../db/client';

// Pulls all user data from Supabase into the local SQLite DB.
// Called once after sign-in when the local DB is empty (fresh install or reinstall).
export async function bootstrapFromSupabase(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const db = await getDb();

    // Check if local DB already has data — skip if so
    const taskCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks_local'
    );
    const expenseCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM expenses_local'
    );
    if ((taskCount?.count ?? 0) > 0 || (expenseCount?.count ?? 0) > 0) return;

    // Pull tasks from Supabase
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at');

    if (tasks && tasks.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const t of tasks) {
          await db.runAsync(
            `INSERT OR IGNORE INTO tasks_local
               (id, server_id, text, status, scheduled_date, reminder_at, created_at, updated_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              t.client_id ?? t.id,
              t.id,
              t.text,
              t.status,
              t.scheduled_date,
              t.reminder_at ?? null,
              t.created_at,
              t.updated_at,
            ]
          );
        }
      });
    }

    // Pull expenses from Supabase
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at');

    if (expenses && expenses.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const e of expenses) {
          await db.runAsync(
            `INSERT OR IGNORE INTO expenses_local
               (id, server_id, item, amount, currency, category, store, date, receipt_scan, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              e.client_id ?? e.id,
              e.id,
              e.item,
              e.amount,
              e.currency ?? 'USD',
              e.category ?? 'other',
              e.store ?? null,
              e.date,
              e.receipt_scan ? 1 : 0,
              e.created_at,
            ]
          );
        }
      });
    }

    if (__DEV__) {
      console.log(`[bootstrapSync] seeded ${tasks?.length ?? 0} tasks, ${expenses?.length ?? 0} expenses`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[bootstrapSync] failed:', err);
  }
}
