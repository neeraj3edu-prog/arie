export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS tasks_local (
    id             TEXT PRIMARY KEY,
    server_id      TEXT,
    text           TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    scheduled_date TEXT NOT NULL,
    reminder_at    TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    synced         INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses_local (
    id             TEXT PRIMARY KEY,
    server_id      TEXT,
    item           TEXT NOT NULL,
    amount         INTEGER NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'USD',
    category       TEXT NOT NULL DEFAULT 'other',
    store          TEXT,
    date           TEXT NOT NULL,
    receipt_scan   INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    synced         INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name     TEXT NOT NULL,
    record_id      TEXT NOT NULL,
    action         TEXT NOT NULL,
    payload        TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    retry_count    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key            TEXT PRIMARY KEY,
    value          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans_local (
    id              TEXT PRIMARY KEY,
    server_id       TEXT,
    type            TEXT NOT NULL,
    subtype         TEXT NOT NULL DEFAULT 'other',
    title           TEXT NOT NULL,
    date            TEXT,
    time            TEXT,
    recurrence      TEXT NOT NULL DEFAULT 'none',
    notify_offset   TEXT NOT NULL DEFAULT 'none',
    notification_id TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL,
    synced          INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS list_items_local (
    id          TEXT PRIMARY KEY,
    plan_id     TEXT NOT NULL,
    text        TEXT NOT NULL,
    done        INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    synced      INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_date      ON tasks_local(scheduled_date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date   ON expenses_local(date);
  CREATE INDEX IF NOT EXISTS idx_plans_date      ON plans_local(date);
  CREATE INDEX IF NOT EXISTS idx_list_items_plan ON list_items_local(plan_id);
  CREATE INDEX IF NOT EXISTS idx_sync_pending    ON sync_queue(created_at)
    WHERE retry_count < 5;
`;
