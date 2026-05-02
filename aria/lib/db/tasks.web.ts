// Web implementation of task DB using localStorage.
// Metro resolves this file instead of tasks.ts on web platform.
import type { Task, NewTask } from '../types';
import { supabase } from '../supabase/client';

const STORE_KEY = 'aria:tasks';

function loadAll(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as Task[];
  } catch {
    return [];
  }
}

function saveAll(tasks: Task[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: (row['client_id'] as string | null) ?? (row['id'] as string),
    serverId: row['id'] as string,
    text: row['text'] as string,
    status: row['status'] as Task['status'],
    scheduledDate: row['scheduled_date'] as string,
    reminderAt: (row['reminder_at'] as string | null) ?? null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
    synced: true,
  };
}

// On first load for a date, pull from Supabase to populate localStorage.
async function bootstrapDate(date: string): Promise<Task[]> {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('scheduled_date', date)
    .order('created_at');
  if (!data?.length) return [];
  const fetched = data.map(rowToTask);
  const all = loadAll();
  const ids = new Set(all.map((t) => t.id));
  saveAll([...all, ...fetched.filter((t) => !ids.has(t.id))]);
  return fetched;
}

export async function getTasksForDate(date: string): Promise<Task[]> {
  const local = loadAll()
    .filter((t) => t.scheduledDate === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (local.length > 0) return local;
  // Nothing local — pull from Supabase to bootstrap
  try {
    return await bootstrapDate(date);
  } catch {
    return [];
  }
}

export async function insertTasksBatch(
  tasks: (NewTask & { id: string; createdAt?: string; updatedAt?: string })[]
): Promise<void> {
  const all = loadAll();
  const ids = new Set(all.map((t) => t.id));
  const now = new Date().toISOString();
  for (const task of tasks) {
    if (!ids.has(task.id)) {
      all.push({
        id: task.id,
        serverId: null,
        text: task.text,
        status: 'pending',
        scheduledDate: task.scheduledDate,
        reminderAt: task.reminderAt ?? null,
        createdAt: task.createdAt ?? now,
        updatedAt: task.updatedAt ?? now,
        synced: false,
      });
    }
  }
  saveAll(all);
}

export async function toggleTask(id: string): Promise<void> {
  const all = loadAll();
  const task = all.find((t) => t.id === id);
  if (task) {
    task.status = task.status === 'complete' ? 'pending' : 'complete';
    task.updatedAt = new Date().toISOString();
    task.synced = false;
    saveAll(all);
  }
}

export async function deleteTask(id: string): Promise<void> {
  saveAll(loadAll().filter((t) => t.id !== id));
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
  const all = loadAll();
  for (const t of tasks) {
    const idx = all.findIndex((x) => x.id === t.client_id);
    if (idx >= 0) {
      if (t.updated_at > all[idx].updatedAt) {
        all[idx] = {
          ...all[idx],
          text: t.text,
          status: t.status as Task['status'],
          updatedAt: t.updated_at,
          synced: true,
        };
      }
    } else {
      all.push({
        id: t.client_id,
        serverId: t.id,
        text: t.text,
        status: t.status as Task['status'],
        scheduledDate: t.scheduled_date,
        reminderAt: t.reminder_at,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        synced: true,
      });
    }
  }
  saveAll(all);
}

export async function getOverdueTasksForDate(date: string): Promise<Task[]> {
  return loadAll()
    .filter((t) => t.scheduledDate < date && t.status === 'pending')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.createdAt.localeCompare(b.createdAt));
}

export async function rescheduleTask(id: string, newDate: string): Promise<void> {
  const all = loadAll();
  const task = all.find((t) => t.id === id);
  if (task) {
    task.scheduledDate = newDate;
    task.updatedAt = new Date().toISOString();
    task.synced = false;
    saveAll(all);
  }
}

export async function getTaskCountForDate(date: string): Promise<number> {
  return loadAll().filter((t) => t.scheduledDate === date && t.status === 'pending').length;
}

// insertTask kept for API parity with native
export async function insertTask(task: NewTask & { id: string }): Promise<void> {
  await insertTasksBatch([task]);
}
