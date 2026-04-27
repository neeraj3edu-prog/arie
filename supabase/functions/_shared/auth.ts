import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function validateRequest(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Missing token');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');

  return { user, supabase };
}

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  event: string,
  maxPerHour: number
): Promise<boolean> {
  const { count } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event', event)
    .gte('created_at', new Date(Date.now() - 3_600_000).toISOString());

  return (count ?? 0) < maxPerHour;
}

export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
