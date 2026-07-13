import type { Plan, ListItem } from '../types';
import { getDb } from './client';

type PlanRow = {
  id: string;
  server_id: string | null;
  type: string;
  subtype: string;
  title: string;
  date: string | null;
  time: string | null;
  recurrence: string;
  notify_offset: string;
  notification_id: string | null;
  notes: string | null;
  created_at: string;
  synced: number;
};

type ListItemRow = {
  id: string;
  plan_id: string;
  text: string;
  done: number;
  sort_order: number;
  synced: number;
};

function rowToPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    serverId: row.server_id,
    type: row.type as Plan['type'],
    subtype: row.subtype as Plan['subtype'],
    title: row.title,
    date: row.date,
    time: row.time,
    recurrence: row.recurrence as Plan['recurrence'],
    notifyOffset: row.notify_offset as Plan['notifyOffset'],
    notificationId: row.notification_id,
    notes: row.notes,
    createdAt: row.created_at,
    synced: row.synced === 1,
  };
}

function rowToListItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    planId: row.plan_id,
    text: row.text,
    done: row.done === 1,
    sortOrder: row.sort_order,
    synced: row.synced === 1,
  };
}

export async function getUpcomingEvents(today: string): Promise<Plan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlanRow>(
    "SELECT * FROM plans_local WHERE type = 'event' AND (date IS NULL OR date >= ?) ORDER BY date ASC, created_at ASC",
    [today]
  );
  return rows.map(rowToPlan);
}

export async function getLists(): Promise<Plan[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlanRow>(
    "SELECT * FROM plans_local WHERE type = 'list' ORDER BY created_at ASC"
  );
  return rows.map(rowToPlan);
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PlanRow>('SELECT * FROM plans_local WHERE id = ?', [id]);
  return row ? rowToPlan(row) : null;
}

export async function getPlanDatesInRange(startDate: string, endDate: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string }>(
    "SELECT DISTINCT date FROM plans_local WHERE date >= ? AND date <= ? AND date IS NOT NULL",
    [startDate, endDate]
  );
  return rows.map((r) => r.date);
}

export async function insertPlan(plan: Plan & { id: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO plans_local (id, type, subtype, title, date, time, recurrence, notify_offset, notification_id, notes, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [plan.id, plan.type, plan.subtype, plan.title, plan.date ?? null, plan.time ?? null, plan.recurrence, plan.notifyOffset, plan.notificationId ?? null, plan.notes ?? null, plan.createdAt]
  );
}

export async function updatePlanNotificationId(id: string, notificationId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE plans_local SET notification_id = ? WHERE id = ?',
    [notificationId, id]
  );
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM list_items_local WHERE plan_id = ?', [id]);
  await db.runAsync('DELETE FROM plans_local WHERE id = ?', [id]);
}

// ── List items ───────────────────────────────────────────────────────────────

export async function getListItems(planId: string): Promise<ListItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ListItemRow>(
    'SELECT * FROM list_items_local WHERE plan_id = ? ORDER BY sort_order ASC, rowid ASC',
    [planId]
  );
  return rows.map(rowToListItem);
}

export async function insertListItem(item: { id: string; planId: string; text: string; sortOrder: number }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO list_items_local (id, plan_id, text, done, sort_order, synced) VALUES (?, ?, ?, 0, ?, 0)',
    [item.id, item.planId, item.text, item.sortOrder]
  );
}

export async function insertListItemsBatch(items: Array<{ id: string; planId: string; text: string; sortOrder: number }>): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        'INSERT OR IGNORE INTO list_items_local (id, plan_id, text, done, sort_order, synced) VALUES (?, ?, ?, 0, ?, 0)',
        [item.id, item.planId, item.text, item.sortOrder]
      );
    }
  });
}

export async function toggleListItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE list_items_local SET done = CASE WHEN done = 0 THEN 1 ELSE 0 END, synced = 0 WHERE id = ?',
    [id]
  );
}

export async function deleteListItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM list_items_local WHERE id = ?', [id]);
}

export async function clearDoneListItems(planId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM list_items_local WHERE plan_id = ? AND done = 1", [planId]);
}

export async function getListItemCount(planId: string): Promise<{ total: number; done: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number; done: number }>(
    'SELECT COUNT(*) as total, SUM(done) as done FROM list_items_local WHERE plan_id = ?',
    [planId]
  );
  return { total: row?.total ?? 0, done: row?.done ?? 0 };
}
