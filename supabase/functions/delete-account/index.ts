// Deletes the authenticated user's account and all associated data.
// Data cleanup relies on ON DELETE CASCADE foreign keys in the schema.
const ALLOWED_ORIGINS = [
  'https://krumjfjmwdkndzvrbgiv.supabase.co',
  'planora://',
  'http://localhost:8081',
  'http://localhost:8082',
];

function cors(req?: Request) {
  const origin = req?.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

async function getUserId(req: Request): Promise<string> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');

  const url = Deno.env.get('SUPABASE_URL') + '/auth/v1/user';
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!res.ok) throw new Error('Unauthorized');
  const user = await res.json() as { id?: string };
  if (!user.id) throw new Error('Unauthorized');
  return user.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(req) });
  }

  try {
    const userId = await getUserId(req);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Delete via Auth Admin API — cascades to all user data via FK constraints
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to delete account');
    }

    return Response.json({ success: true }, { headers: cors(req) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg === 'Unauthorized' ? 401 : 500;
    const clientMsg = status === 500 ? 'Failed to delete account' : msg;
    return Response.json({ error: clientMsg }, { status, headers: cors(req) });
  }
});
