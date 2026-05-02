import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { getTasksForDate, insertTasksBatch, toggleTask, deleteTask, upsertTasksBatch, getOverdueTasksForDate, rescheduleTask } from '@/lib/db/tasks';
import { addToSyncQueue } from '@/lib/sync/queue';
import { triggerSync } from '@/lib/sync/syncEngine';
import { supabase } from '@/lib/supabase/client';
import type { NewTask } from '@/lib/types';

export function useTasks(date: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tasks', date],
    queryFn: () => getTasksForDate(date),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
  });

  const overdueQuery = useQuery({
    queryKey: ['tasks', 'overdue', date],
    queryFn: () => getOverdueTasksForDate(date),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
  });

  // Realtime push for native (web polls via invalidation after sync)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const channel = supabase
      .channel(`tasks:${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `scheduled_date=eq.${date}` },
        async () => {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('scheduled_date', date)
            .order('created_at');
          if (data) {
            await upsertTasksBatch(data);
            queryClient.invalidateQueries({ queryKey: ['tasks', date] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [date, queryClient]);

  // Foreground sync (native only — web syncs in syncEngine.web.ts)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') triggerSync();
    });
    return () => sub.remove();
  }, []);

  const addTasks = useMutation({
    mutationFn: async (texts: string[]) => {
      const now = new Date().toISOString();
      const newTasks = texts.map((text) => ({
        id: crypto.randomUUID(),
        text,
        scheduledDate: date,
        reminderAt: null,
        createdAt: now,
        updatedAt: now,
      } satisfies NewTask & { id: string; createdAt: string; updatedAt: string }));

      // Write to local DB first (SQLite on native, localStorage on web)
      await insertTasksBatch(newTasks);
      // Queue for async Supabase sync
      await addToSyncQueue(
        newTasks.map((t) => ({
          tableName: 'tasks' as const,
          recordId: t.id,
          action: 'insert' as const,
          payload: {
            client_id: t.id,
            text: t.text,
            status: 'pending',
            scheduled_date: t.scheduledDate,
            reminder_at: t.reminderAt,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
          },
        }))
      );
      return newTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', date] });
      triggerSync();
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await toggleTask(id);
      // Re-read to get the new status for the sync payload
      const tasks = await getTasksForDate(date);
      const updated = tasks.find((t) => t.id === id);
      if (updated) {
        await addToSyncQueue([{
          tableName: 'tasks',
          recordId: id,
          action: 'update',
          payload: {
            client_id: id,
            text: updated.text,
            status: updated.status,
            scheduled_date: updated.scheduledDate,
            reminder_at: updated.reminderAt,
            updated_at: updated.updatedAt,
          },
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', date] });
      triggerSync();
    },
  });

  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      await deleteTask(id);
      await addToSyncQueue([{
        tableName: 'tasks',
        recordId: id,
        action: 'delete',
        payload: { id },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      triggerSync();
    },
  });

  const moveToToday = useMutation({
    mutationFn: async (id: string) => {
      await rescheduleTask(id, date);
      await addToSyncQueue([{
        tableName: 'tasks',
        recordId: id,
        action: 'update',
        payload: { client_id: id, scheduled_date: date, updated_at: new Date().toISOString() },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      triggerSync();
    },
  });

  return {
    tasks: query.data ?? [],
    overdueTasks: overdueQuery.data ?? [],
    loading: query.isLoading,
    addTasks,
    toggleTask: toggleTaskMutation,
    removeTask,
    moveToToday,
  };
}
