-- Run as superuser in Supabase SQL editor after enabling pg_cron extension
-- Dashboard → Database → Extensions → enable pg_cron

-- Send pending notifications every minute
select cron.schedule(
  'drain-notification-queue',
  '* * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notifications-send',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Morning briefing: every day at 06:00 UTC
select cron.schedule(
  'morning-briefing',
  '0 6 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notifications-morning',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
