// Called by pg_cron daily at 06:00 UTC
Deno.serve(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, timezone, push_token')
    .eq('notif_morning', true)
    .not('push_token', 'is', null);

  if (!profiles?.length) return Response.json({ queued: 0 });

  const todayUTC = new Date().toISOString().slice(0, 10);
  let queued = 0;

  for (const profile of profiles) {
    // Check if current UTC time is 07:00–09:00 in the user's timezone
    const localHour = new Date().toLocaleString('en-US', {
      timeZone: profile.timezone ?? 'UTC',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(localHour, 10);
    if (hour < 7 || hour >= 9) continue;

    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('scheduled_date', todayUTC)
      .eq('status', 'pending');

    if (!count || count === 0) continue;

    await supabase.from('notification_queue').insert({
      user_id: profile.id,
      push_token: profile.push_token,
      title: 'Good morning! ☀️',
      body: `You have ${count} task${count === 1 ? '' : 's'} today.`,
      data: { type: 'briefing' },
      send_at: new Date().toISOString(),
    });
    queued++;
  }

  return Response.json({ queued });
});
