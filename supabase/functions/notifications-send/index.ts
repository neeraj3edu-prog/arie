// Called by pg_cron every minute — uses service_role key
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: pending } = await supabase
    .from('notification_queue')
    .select('*')
    .lte('send_at', new Date().toISOString())
    .eq('sent', false)
    .limit(100);

  if (!pending?.length) return Response.json({ sent: 0 });

  const messages = pending.map((n: { push_token: string; title: string; body: string; data: unknown }) => ({
    to: n.push_token,
    title: n.title,
    body: n.body,
    data: n.data,
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify(messages),
  });

  const ids = pending.map((n: { id: string }) => n.id);
  await supabase
    .from('notification_queue')
    .update({ sent: true, sent_at: new Date().toISOString() })
    .in('id', ids);

  return Response.json({ sent: ids.length });
});
