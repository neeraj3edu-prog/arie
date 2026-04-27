// Web implementation of sync queue using localStorage.
// Metro resolves this file instead of queue.ts on web platform.
import type { SyncQueueItem, SyncAction } from '../types';

const QUEUE_KEY = 'aria:sync_queue';

type QueueEntry = {
  tableName: 'tasks' | 'expenses';
  recordId: string;
  action: SyncAction;
  payload: object;
};

function loadQueue(): SyncQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as SyncQueueItem[];
  } catch {
    return [];
  }
}

function saveQueue(items: SyncQueueItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

let _nextId = Date.now(); // pseudo-unique enough for localStorage

export async function addToSyncQueue(entries: QueueEntry[]): Promise<void> {
  const queue = loadQueue();
  const now = new Date().toISOString();
  for (const entry of entries) {
    queue.push({
      id: _nextId++,
      tableName: entry.tableName,
      recordId: entry.recordId,
      action: entry.action,
      payload: JSON.stringify(entry.payload),
      retryCount: 0,
      createdAt: now,
    });
  }
  saveQueue(queue);
}

export async function getPendingItems(limit = 50): Promise<SyncQueueItem[]> {
  return loadQueue()
    .filter((i) => i.retryCount < 5)
    .slice(0, limit);
}

export async function removeFromQueue(id: number): Promise<void> {
  saveQueue(loadQueue().filter((i) => i.id !== id));
}

export async function incrementRetry(id: number): Promise<void> {
  const queue = loadQueue();
  const item = queue.find((i) => i.id === id);
  if (item) item.retryCount += 1;
  saveQueue(queue);
}

export async function getPendingCount(): Promise<number> {
  return loadQueue().filter((i) => i.retryCount < 5).length;
}
