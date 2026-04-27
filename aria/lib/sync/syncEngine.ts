import { supabase } from '../supabase/client';
import { getPendingItems, removeFromQueue, incrementRetry } from './queue';
import { useSyncStore } from '@/store/syncStore';

let _isSyncing = false;

export async function syncPendingQueue(): Promise<void> {
  if (_isSyncing) return;
  _isSyncing = true;

  const { setIsSyncing, setPendingCount, setLastSyncAt } = useSyncStore.getState();
  setIsSyncing(true);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const pending = await getPendingItems(50);
    if (pending.length === 0) {
      setLastSyncAt(new Date());
      return;
    }

    const results = await Promise.allSettled(
      pending.map(async (item) => {
        const payload = JSON.parse(item.payload) as Record<string, unknown>;

        if (item.action === 'insert' || item.action === 'update') {
          const { error } = await supabase
            .from(item.tableName)
            .upsert({ ...payload, user_id: session.user.id }, { onConflict: 'client_id' });
          if (error) throw error;
        } else if (item.action === 'delete') {
          const { error } = await supabase
            .from(item.tableName)
            .delete()
            .eq('client_id', payload['id'] as string);
          if (error) throw error;
        }

        await removeFromQueue(item.id);
      })
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        await incrementRetry(pending[i].id);
      }
    }

    const remaining = await getPendingItems(1);
    setPendingCount(remaining.length);
    setLastSyncAt(new Date());
  } catch (err) {
    if (__DEV__) console.warn('[syncEngine]', err);
  } finally {
    _isSyncing = false;
    setIsSyncing(false);
  }
}

export function triggerSync(): void {
  syncPendingQueue().catch((err: unknown) => {
    if (__DEV__) console.warn('[syncEngine] trigger error', err);
  });
}

export { removeFromQueue, incrementRetry };
