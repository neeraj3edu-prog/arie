import { getDb } from '../db/client';
import type { SyncAction, SyncQueueItem } from '../types';

type QueueEntry = {
  tableName: 'tasks' | 'expenses';
  recordId: string;
  action: SyncAction;
  payload: object;
};

export async function addToSyncQueue(entries: QueueEntry[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        `INSERT INTO sync_queue (table_name, record_id, action, payload, created_at, retry_count)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [entry.tableName, entry.recordId, entry.action, JSON.stringify(entry.payload), now]
      );
    }
  });
}

export async function getPendingItems(limit = 50): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<SyncQueueItem>(
    `SELECT id, table_name as tableName, record_id as recordId, action, payload, created_at as createdAt, retry_count as retryCount
     FROM sync_queue
     WHERE retry_count < 5
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit]
  );
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function incrementRetry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
    [id]
  );
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue WHERE retry_count < 5'
  );
  return row?.count ?? 0;
}
