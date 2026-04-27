// Web implementation of sync engine — pushes localStorage queue to Supabase.
// Metro resolves this file instead of syncEngine.ts on web platform.
import { supabase } from '../supabase/client';
import { getPendingItems, removeFromQueue, incrementRetry } from './queue';

let _isSyncing = false;

export async function syncPendingQueue(): Promise<void> {
  if (_isSyncing) return;
  _isSyncing = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const pending = await getPendingItems(50);
    if (!pending.length) return;

    await Promise.allSettled(
      pending.map(async (item) => {
        try {
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
        } catch {
          await incrementRetry(item.id);
        }
      })
    );
  } catch {
    // Network or auth failure — will retry on next triggerSync call
  } finally {
    _isSyncing = false;
  }
}

export function triggerSync(): void {
  syncPendingQueue().catch(() => {});
}

export { removeFromQueue, incrementRetry };
