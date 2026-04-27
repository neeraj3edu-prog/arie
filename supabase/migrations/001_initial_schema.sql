-- ── User profiles ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text,
  avatar_url      text,
  timezone        text not null default 'UTC',
  currency        text not null default 'USD',
  push_token      text,
  notif_morning   boolean default true,
  notif_reminders boolean default true,
  onboarded       boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade not null,
  text           text not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'complete')),
  scheduled_date date not null,
  reminder_at    timestamptz,
  client_id      uuid unique,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists tasks_user_date on tasks (user_id, scheduled_date);
create index if not exists tasks_reminder  on tasks (reminder_at) where reminder_at is not null;

-- ── Expenses ──────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade not null,
  item           text not null,
  amount         integer not null check (amount >= 0),
  currency       text not null default 'USD',
  category       text not null default 'other'
                   check (category in (
                     'groceries','dining','transport','shopping',
                     'health','entertainment','utilities','other')),
  store          text,
  date           date not null,
  receipt_scan   boolean default false,
  client_id      uuid unique,
  created_at     timestamptz default now()
);

create index if not exists expenses_user_date on expenses (user_id, date);

-- ── Notification queue ────────────────────────────────────────────────────────
create table if not exists notification_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  push_token  text not null,
  title       text not null,
  body        text not null,
  data        jsonb,
  send_at     timestamptz not null,
  sent        boolean default false,
  sent_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists notif_unsent on notification_queue (send_at) where sent = false;

-- ── Usage analytics ───────────────────────────────────────────────────────────
create table if not exists usage_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users,
  event       text not null,
  metadata    jsonb,
  created_at  timestamptz default now()
);

create index if not exists usage_user_event on usage_events (user_id, event, created_at);
