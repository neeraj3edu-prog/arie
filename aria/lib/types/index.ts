// ── Shared domain types ──────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'complete';

export type ExpenseCategory =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'utilities'
  | 'other';

export type VoiceMode = 'tasks' | 'expenses';

export type VoicePhase =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'processing'
  | 'success'
  | 'error';

export type SyncAction = 'insert' | 'update' | 'delete';

// ── Task ────────────────────────────────────────────────────────────────────

export type Task = {
  id: string;           // client_id (UUID)
  serverId: string | null;
  text: string;
  status: TaskStatus;
  scheduledDate: string; // 'YYYY-MM-DD'
  reminderAt: string | null; // ISO timestamp
  createdAt: string;
  updatedAt: string;
  synced: boolean;
};

export type NewTask = Pick<Task, 'text' | 'scheduledDate' | 'reminderAt'>;

// ── Expense ─────────────────────────────────────────────────────────────────

export type Expense = {
  id: string;
  serverId: string | null;
  item: string;
  amount: number;        // cents
  currency: string;
  category: ExpenseCategory;
  store: string | null;
  date: string;          // 'YYYY-MM-DD'
  receiptScan: boolean;
  createdAt: string;
  synced: boolean;
};

export type NewExpense = Pick<
  Expense,
  'item' | 'amount' | 'currency' | 'category' | 'store' | 'date' | 'receiptScan'
>;

// ── AI parse response ────────────────────────────────────────────────────────

export type ParsedTask = { text: string };

export type ParsedExpense = {
  item: string;
  amount: number;
  store?: string;
  category: ExpenseCategory;
};

// ── Sync ────────────────────────────────────────────────────────────────────

export type SyncQueueItem = {
  id: number;
  tableName: 'tasks' | 'expenses';
  recordId: string;
  action: SyncAction;
  payload: string; // JSON
  createdAt: string;
  retryCount: number;
};

// ── Auth ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  currency: string;
  onboarded: boolean;
};

// ── Result pattern ───────────────────────────────────────────────────────────

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}
