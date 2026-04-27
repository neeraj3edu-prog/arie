import { validateRequest, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const { user, supabase } = await validateRequest(req);

    type Body = { task_id: string; title: string; body: string; send_at: string };
    const { task_id, title, body, send_at } = await req.json() as Body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', user.id)
      .single();

    if (!profile?.push_token) {
      return Response.json({ error: 'No push token registered' }, { status: 400, headers: corsHeaders() });
    }

    await supabase.from('notification_queue').insert({
      user_id: user.id,
      push_token: profile.push_token,
      title,
      body,
      data: { task_id, type: 'reminder' },
      send_at,
    });

    return Response.json({ ok: true }, { headers: corsHeaders() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = msg === 'Unauthorized' || msg === 'Missing token' ? 401 : 500;
    return Response.json({ error: msg }, { status, headers: corsHeaders() });
  }
});
