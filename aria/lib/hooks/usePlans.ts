import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUpcomingEvents, getLists, getPlanById, getPlanDatesInRange,
  insertPlan, updatePlanNotificationId, deletePlan,
  getListItems, insertListItem, insertListItemsBatch, toggleListItem, deleteListItem, clearDoneListItems,
} from '@/lib/db/plans';
import { addToSyncQueue } from '@/lib/sync/queue';
import { triggerSync } from '@/lib/sync/syncEngine';
import { generateUUID } from '@/lib/utils/uuid';
import { localDateISO } from '@/lib/utils/date';
import { scheduleNotificationForPlan, cancelPlanNotification } from '@/lib/utils/planNotifications';
import type { NewPlan, ParsedPlan, Plan } from '@/lib/types';

export function usePlans() {
  const queryClient = useQueryClient();
  const today = localDateISO();

  const eventsQuery = useQuery({
    queryKey: ['plans', 'events', today],
    queryFn: () => getUpcomingEvents(today),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
  });

  const listsQuery = useQuery({
    queryKey: ['plans', 'lists'],
    queryFn: () => getLists(),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
  });

  const addPlan = useMutation({
    mutationFn: async (data: NewPlan & { listItems?: string[] }) => {
      const id = generateUUID();
      const now = new Date().toISOString();
      const plan: Plan & { id: string } = {
        id,
        serverId: null,
        type: data.type,
        subtype: data.subtype,
        title: data.title,
        date: data.date,
        time: data.time,
        recurrence: data.recurrence,
        notifyOffset: data.notifyOffset,
        notificationId: null,
        notes: data.notes,
        createdAt: now,
        synced: false,
      };

      await insertPlan(plan);

      if (Platform.OS !== 'web') {
        const notifId = await scheduleNotificationForPlan(plan);
        if (notifId) await updatePlanNotificationId(id, notifId);
      }

      if (data.listItems && data.listItems.length > 0) {
        const items = data.listItems.map((text, i) => ({ id: generateUUID(), planId: id, text, sortOrder: i }));
        await insertListItemsBatch(items);
        await addToSyncQueue(items.map((item) => ({
          tableName: 'list_items' as const,
          recordId: item.id,
          action: 'insert' as const,
          payload: { client_id: item.id, plan_id: item.planId, text: item.text, sort_order: item.sortOrder, done: 0 },
        })));
      }

      await addToSyncQueue([{
        tableName: 'plans' as const,
        recordId: id,
        action: 'insert' as const,
        payload: {
          client_id: id,
          type: plan.type,
          subtype: plan.subtype,
          title: plan.title,
          date: plan.date,
          time: plan.time,
          recurrence: plan.recurrence,
          notify_offset: plan.notifyOffset,
          notes: plan.notes,
          created_at: now,
        },
      }]);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      triggerSync();
    },
    onError: (err) => {
      if (__DEV__) console.error('[addPlan] failed:', err);
    },
  });

  const addPlanFromVoice = useMutation({
    mutationFn: async (parsed: ParsedPlan) => {
      if (parsed.type === 'list' && parsed.listItems.length > 0) {
        const lists = await getLists();
        const existing = lists.find(
          (l) => l.title.toLowerCase() === parsed.title.toLowerCase()
        );
        if (existing) {
          const base = Date.now();
          const items = parsed.listItems.map((text, i) => ({
            id: generateUUID(),
            planId: existing.id,
            text,
            sortOrder: base + i,
          }));
          await insertListItemsBatch(items);
          await addToSyncQueue(items.map((item) => ({
            tableName: 'list_items' as const,
            recordId: item.id,
            action: 'insert' as const,
            payload: { client_id: item.id, plan_id: item.planId, text: item.text, sort_order: item.sortOrder, done: 0 },
          })));
          return existing.id;
        }
      }
      return addPlan.mutateAsync({ ...parsed, notes: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['list_items'] });
      triggerSync();
    },
    onError: (err) => {
      if (__DEV__) console.error('[addPlanFromVoice] failed:', err);
    },
  });

  const removePlan = useMutation({
    mutationFn: async (id: string) => {
      const plan = await getPlanById(id);
      if (plan?.notificationId) await cancelPlanNotification(plan.notificationId);
      await deletePlan(id);
      await addToSyncQueue([{
        tableName: 'plans' as const,
        recordId: id,
        action: 'delete' as const,
        payload: { id },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['list_items'] });
      triggerSync();
    },
  });

  return {
    events: eventsQuery.data ?? [],
    lists: listsQuery.data ?? [],
    loading: eventsQuery.isLoading || listsQuery.isLoading,
    addPlan,
    addPlanFromVoice,
    removePlan,
  };
}

export function usePlanDates(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['plans', 'dates', startDate, endDate],
    queryFn: () => getPlanDatesInRange(startDate, endDate),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
  });
}

export function useListItems(planId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['list_items', planId],
    queryFn: () => getListItems(planId),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
    enabled: !!planId,
  });

  const addItem = useMutation({
    mutationFn: async (text: string) => {
      const trimmed = text.trim().slice(0, 500);
      if (!trimmed) return;
      const id = generateUUID();
      const sortOrder = Date.now();
      await insertListItem({ id, planId, text: trimmed, sortOrder });
      await addToSyncQueue([{
        tableName: 'list_items' as const,
        recordId: id,
        action: 'insert' as const,
        payload: { client_id: id, plan_id: planId, text: trimmed, sort_order: sortOrder, done: 0 },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list_items', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'lists'] });
      triggerSync();
    },
  });

  const addItems = useMutation({
    mutationFn: async (texts: string[]) => {
      const valid = texts.map((t) => t.trim()).filter((t) => t.length > 0);
      if (valid.length === 0) return;
      const base = Date.now();
      const items = valid.map((text, i) => ({ id: generateUUID(), planId, text, sortOrder: base + i }));
      await insertListItemsBatch(items);
      await addToSyncQueue(items.map((item) => ({
        tableName: 'list_items' as const,
        recordId: item.id,
        action: 'insert' as const,
        payload: { client_id: item.id, plan_id: planId, text: item.text, sort_order: item.sortOrder, done: 0 },
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list_items', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'lists'] });
      triggerSync();
    },
  });

  const toggleItem = useMutation({
    mutationFn: async (id: string) => {
      await toggleListItem(id);
      const item = query.data?.find((i) => i.id === id);
      if (item) {
        await addToSyncQueue([{
          tableName: 'list_items' as const,
          recordId: id,
          action: 'update' as const,
          payload: { client_id: id, plan_id: planId, text: item.text, done: item.done ? 0 : 1, sort_order: item.sortOrder },
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list_items', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'lists'] });
      triggerSync();
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await deleteListItem(id);
      await addToSyncQueue([{
        tableName: 'list_items' as const,
        recordId: id,
        action: 'delete' as const,
        payload: { id },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list_items', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'lists'] });
      triggerSync();
    },
  });

  const clearDone = useMutation({
    mutationFn: async () => {
      const done = query.data?.filter((i) => i.done) ?? [];
      await clearDoneListItems(planId);
      await addToSyncQueue(done.map((i) => ({
        tableName: 'list_items' as const,
        recordId: i.id,
        action: 'delete' as const,
        payload: { id: i.id },
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list_items', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'lists'] });
      triggerSync();
    },
  });

  const getItemsForVoice = useCallback(() => query.data ?? [], [query.data]);

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    addItem,
    addItems,
    toggleItem,
    removeItem,
    clearDone,
    getItemsForVoice,
  };
}
