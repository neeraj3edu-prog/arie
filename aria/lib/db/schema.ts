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

  CREATE INDEX IF NOT EXISTS idx_tasks_date    ON tasks_local(scheduled_date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses_local(date);
  CREATE INDEX IF NOT EXISTS idx_sync_pending  ON sync_queue(created_at)
    WHERE retry_count < 5;
`;
