import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import {
  getExpensesForMonth,
  getExpensesForDate,
  insertExpensesBatch,
  deleteExpense,
} from '@/lib/db/expenses';
import { addToSyncQueue } from '@/lib/sync/queue';
import { triggerSync } from '@/lib/sync/syncEngine';
import { supabase } from '@/lib/supabase/client';
import type { NewExpense } from '@/lib/types';

export function useExpensesForDate(date: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['expenses', 'date', date],
    queryFn: () => getExpensesForDate(date),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
  });

  const addExpenses = useMutation({
    mutationFn: async (expenses: NewExpense[]) => {
      const now = new Date().toISOString();
      const newExpenses = expenses.map((e) => ({ ...e, id: crypto.randomUUID(), createdAt: now }));

      // Write to local DB first (SQLite on native, localStorage on web)
      await insertExpensesBatch(newExpenses);
      // Queue for async Supabase sync
      await addToSyncQueue(
        newExpenses.map((e) => ({
          tableName: 'expenses' as const,
          recordId: e.id,
          action: 'insert' as const,
          payload: {
            client_id: e.id,
            item: e.item,
            amount: e.amount,
            currency: e.currency,
            category: e.category,
            store: e.store,
            date: e.date,
            receipt_scan: e.receiptScan,
            created_at: now,
          },
        }))
      );
      return newExpenses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      triggerSync();
    },
  });

  const removeExpense = useMutation({
    mutationFn: async (id: string) => {
      await deleteExpense(id);
      await addToSyncQueue([{
        tableName: 'expenses',
        recordId: id,
        action: 'delete',
        payload: { id },
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      triggerSync();
    },
  });

  return {
    expenses: query.data ?? [],
    loading: query.isLoading,
    addExpenses,
    removeExpense,
  };
}

export function useExpensesForMonth(monthPrefix: string) {
  const queryClient = useQueryClient();

  // Realtime push for native (web syncs via syncEngine.web.ts)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const channel = supabase
      .channel(`expenses:${monthPrefix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, async () => {
        queryClient.invalidateQueries({ queryKey: ['expenses', 'month', monthPrefix] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [monthPrefix, queryClient]);

  // Foreground sync (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') triggerSync();
    });
    return () => sub.remove();
  }, []);

  return useQuery({
    queryKey: ['expenses', 'month', monthPrefix],
    queryFn: () => getExpensesForMonth(monthPrefix),
    staleTime: 60_000,
    gcTime: 24 * 3_600_000,
  });
}
