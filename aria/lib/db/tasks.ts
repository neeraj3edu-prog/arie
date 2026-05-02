import type { Task, NewTask } from '../types';
import { getDb } from './client';

type TaskRow = {
  id: string;
  server_id: string | null;
  text: string;
  status: string;
  scheduled_date: string;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
  synced: number;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    serverId: row.server_id,
    text: row.text,
    status: row.status as Task['status'],
    scheduledDate: row.scheduled_date,
    reminderAt: row.reminder_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: row.synced === 1,
  };
}

export async function getTasksForDate(date: string): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks_local WHERE scheduled_date = ? ORDER BY created_at ASC',
    [date]
  );
  return rows.map(rowToTask);
}

export async function insertTask(task: NewTask & { id: string }): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO tasks_local (id, text, status, scheduled_date, reminder_at, created_at, updated_at, synced)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, 0)`,
    [task.id, task.text, task.scheduledDate, task.reminderAt ?? null, now, now]
  );
}

export async function insertTasksBatch(
  tasks: (NewTask & { id: string })[]
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const task of tasks) {
      await db.runAsync(
        `INSERT OR IGNORE INTO tasks_local (id, text, status, scheduled_date, reminder_at, created_at, updated_at, synced)
         VALUES (?, ?, 'pending', ?, ?, ?, ?, 0)`,
        [task.id, task.text, task.scheduledDate, task.reminderAt ?? null, now, now]
      );
    }
  });
}

export async function toggleTask(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks_local
     SET status = CASE WHEN status = 'pending' THEN 'complete' ELSE 'pending' END,
         updated_at = ?,
         synced = 0
     WHERE id = ?`,
    [now, id]
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks_local WHERE id = ?', [id]);
}

export async function upsertTasksBatch(
  tasks: Array<{
    client_id: string;
    id: string;
    text: string;
    status: string;
    scheduled_date: string;
    reminder_at: string | null;
    created_at: string;
    updated_at: string;
  }>
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of tasks) {
      await db.runAsync(
        `INSERT INTO tasks_local (id, server_id, text, status, scheduled_date, reminder_at, created_at, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           server_id = excluded.server_id,
           text = excluded.text,
           status = excluded.status,
           updated_at = excluded.updated_at,
           synced = 1
         WHERE excluded.updated_at > tasks_local.updated_at`,
        [t.client_id, t.id, t.text, t.status, t.scheduled_date, t.reminder_at, t.created_at, t.updated_at]
      );
    }
  });
}

export async function getOverdueTasksForDate(date: string): Promise<import('../types').Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks_local WHERE scheduled_date < ? AND status = ? ORDER BY scheduled_date ASC, created_at ASC',
    [date, 'pending']
  );
  return rows.map(rowToTask);
}

export async function rescheduleTask(id: string, newDate: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE tasks_local SET scheduled_date = ?, updated_at = ?, synced = 0 WHERE id = ?',
    [newDate, new Date().toISOString(), id]
  );
}

export async function getTaskCountForDate(date: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tasks_local WHERE scheduled_date = ? AND status = ?',
    [date, 'pending']
  );
  return row?.count ?? 0;
}
