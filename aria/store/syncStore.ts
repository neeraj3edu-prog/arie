import { create } from 'zustand';

type SyncStore = {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  setOnline: (online: boolean) => void;
  setPendingCount: (n: number) => void;
  setLastSyncAt: (d: Date) => void;
  setIsSyncing: (v: boolean) => void;
};

export const useSyncStore = create<SyncStore>((set) => ({
  isOnline: true,
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,

  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
