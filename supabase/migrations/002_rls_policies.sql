-- Enable RLS on all tables
alter table profiles           enable row level security;
alter table tasks               enable row level security;
alter table expenses            enable row level security;
alter table notification_queue  enable row level security;
alter table usage_events        enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────────
create policy "profiles: select own" on profiles
  for select using (id = auth.uid());

create policy "profiles: insert own" on profiles
  for insert with check (id = auth.uid());

create policy "profiles: update own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── tasks ─────────────────────────────────────────────────────────────────────
create policy "tasks: select own" on tasks
  for select using (user_id = auth.uid());

create policy "tasks: insert own" on tasks
  for insert with check (user_id = auth.uid());

create policy "tasks: update own" on tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "tasks: delete own" on tasks
  for delete using (user_id = auth.uid());

-- ── expenses ──────────────────────────────────────────────────────────────────
create policy "expenses: select own" on expenses
  for select using (user_id = auth.uid());

create policy "expenses: insert own" on expenses
  for insert with check (user_id = auth.uid());

create policy "expenses: update own" on expenses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "expenses: delete own" on expenses
  for delete using (user_id = auth.uid());

-- ── notification_queue ────────────────────────────────────────────────────────
-- Users can insert their own notifications; only service_role reads/updates
create policy "notif: insert own" on notification_queue
  for insert with check (user_id = auth.uid());

-- ── usage_events ──────────────────────────────────────────────────────────────
create policy "usage: insert own" on usage_events
  for insert with check (user_id = auth.uid());
