// Web implementation of plans DB using localStorage.
import type { Plan, ListItem } from '../types';

const PLANS_KEY = 'aria:plans';
const ITEMS_KEY = 'aria:list_items';

function loadPlans(): Plan[] {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) ?? '[]') as Plan[]; } catch { return []; }
}
function savePlans(plans: Plan[]): void { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); }

function loadItems(): ListItem[] {
  try { return JSON.parse(localStorage.getItem(ITEMS_KEY) ?? '[]') as ListItem[]; } catch { return []; }
}
function saveItems(items: ListItem[]): void { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); }

export async function getUpcomingEvents(today: string): Promise<Plan[]> {
  return loadPlans()
    .filter((p) => p.type === 'event' && (!p.date || p.date >= today))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.createdAt.localeCompare(b.createdAt));
}

export async function getLists(): Promise<Plan[]> {
  return loadPlans()
    .filter((p) => p.type === 'list')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getPlanById(id: string): Promise<Plan | null> {
  return loadPlans().find((p) => p.id === id) ?? null;
}

export async function getPlanDatesInRange(startDate: string, endDate: string): Promise<string[]> {
  return [...new Set(
    loadPlans()
      .filter((p) => p.date && p.date >= startDate && p.date <= endDate)
      .map((p) => p.date as string)
  )];
}

export async function insertPlan(plan: Plan & { id: string }): Promise<void> {
  const plans = loadPlans();
  if (!plans.some((p) => p.id === plan.id)) savePlans([...plans, plan]);
}

export async function updatePlanNotificationId(id: string, notificationId: string): Promise<void> {
  savePlans(loadPlans().map((p) => p.id === id ? { ...p, notificationId } : p));
}

export async function deletePlan(id: string): Promise<void> {
  savePlans(loadPlans().filter((p) => p.id !== id));
  saveItems(loadItems().filter((i) => i.planId !== id));
}

export async function getListItems(planId: string): Promise<ListItem[]> {
  return loadItems()
    .filter((i) => i.planId === planId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function insertListItem(item: { id: string; planId: string; text: string; sortOrder: number }): Promise<void> {
  const items = loadItems();
  if (!items.some((i) => i.id === item.id)) {
    saveItems([...items, { id: item.id, planId: item.planId, text: item.text, done: false, sortOrder: item.sortOrder, synced: false }]);
  }
}

export async function insertListItemsBatch(items: Array<{ id: string; planId: string; text: string; sortOrder: number }>): Promise<void> {
  const all = loadItems();
  const ids = new Set(all.map((i) => i.id));
  for (const item of items) {
    if (!ids.has(item.id)) {
      all.push({ id: item.id, planId: item.planId, text: item.text, done: false, sortOrder: item.sortOrder, synced: false });
    }
  }
  saveItems(all);
}

export async function toggleListItem(id: string): Promise<void> {
  saveItems(loadItems().map((i) => i.id === id ? { ...i, done: !i.done, synced: false } : i));
}

export async function deleteListItem(id: string): Promise<void> {
  saveItems(loadItems().filter((i) => i.id !== id));
}

export async function clearDoneListItems(planId: string): Promise<void> {
  saveItems(loadItems().filter((i) => !(i.planId === planId && i.done)));
}

export async function getListItemCount(planId: string): Promise<{ total: number; done: number }> {
  const items = loadItems().filter((i) => i.planId === planId);
  return { total: items.length, done: items.filter((i) => i.done).length };
}
