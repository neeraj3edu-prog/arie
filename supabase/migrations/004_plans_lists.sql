-- ── Plans & Smart Lists ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT UNIQUE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('event', 'list')),
  subtype         TEXT NOT NULL DEFAULT 'other' CHECK (subtype IN ('birthday', 'appointment', 'class', 'other')),
  title           TEXT NOT NULL,
  date            DATE,
  time            TEXT,
  recurrence      TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  notify_offset   TEXT NOT NULL DEFAULT 'none' CHECK (notify_offset IN ('day_before', 'morning_of', '1_hour_before', 'none')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS list_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   TEXT UNIQUE,
  plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_user    ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_date    ON plans(date);
CREATE INDEX IF NOT EXISTS idx_list_items_plan ON list_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_list_items_user ON list_items(user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own plans"
  ON plans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can insert own plans"
  ON plans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own plans"
  ON plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can delete own plans"
  ON plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users can read own list items"
  ON list_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can insert own list items"
  ON list_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own list items"
  ON list_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can delete own list items"
  ON list_items FOR DELETE USING (auth.uid() = user_id);
