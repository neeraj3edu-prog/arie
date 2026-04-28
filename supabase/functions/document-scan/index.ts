import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const RATE_LIMIT = 20;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

async function validateRequest(req: Request) {
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

async function checkRateLimit(
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

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  type ServiceAccount = { client_email: string; private_key: string };
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(claim));
  const unsigned = `${header}.${payload}`;

  const keyData = sa.private_key
    .split('-----BEGIN PRIVATE KEY-----').join('')
    .split('-----END PRIVATE KEY-----').join('')
    .split('\n').join('')
    .split(' ').join('');
  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const signatureBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json() as { access_token: string };
  return tokenData.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const { user, supabase } = await validateRequest(req);

    if (!(await checkRateLimit(supabase, user.id, 'document_scan', RATE_LIMIT))) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    if (!image) return Response.json({ error: 'No image provided' }, { status: 400, headers: corsHeaders() });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ error: 'Image too large' }, { status: 413, headers: corsHeaders() });

    const imageBytes = await image.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));

    const processorId = Deno.env.get('GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID');
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');

    const accessToken = await getGoogleAccessToken(serviceAccountJson);

    const docAiResponse = await fetch(
      `https://us-documentai.googleapis.com/v1/projects/472866365827/locations/us/processors/${processorId}:process`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawDocument: { content: base64Image, mimeType: image.type || 'image/jpeg' },
        }),
      }
    );

    if (!docAiResponse.ok) {
      console.error('DocAI error:', await docAiResponse.text());
      return Response.json({ error: 'Document scan failed' }, { status: 502, headers: corsHeaders() });
    }

    type Entity = {
      type: string;
      mentionText?: string;
      normalizedValue?: { dateValue?: { year: number; month: number; day: number } };
      properties?: Entity[];
    };
    const docAiData = await docAiResponse.json() as { document?: { entities?: Entity[] } };
    const entities = docAiData.document?.entities ?? [];

    const storeName = entities.find((e) => e.type === 'supplier_name')?.mentionText ?? undefined;
    const receiptDate = entities.find((e) => e.type === 'invoice_date')?.normalizedValue?.dateValue;

    const lineItems = entities
      .filter((e) => e.type === 'line_item')
      .map((item) => {
        const desc = item.properties?.find((p) => p.type === 'line_item/description')?.mentionText;
        const amount = item.properties?.find((p) => p.type === 'line_item/amount')?.mentionText;
        const amountCents = amount ? Math.round(parseFloat(amount.replace(/[^0-9.]/g, '')) * 100) : 0;
        return { description: desc, amountCents };
      })
      .filter((i) => i.description);

    const formattedDate = receiptDate
      ? `${receiptDate.year}-${String(receiptDate.month).padStart(2, '0')}-${String(receiptDate.day).padStart(2, '0')}`
      : undefined;

    supabase.from('usage_events').insert({
      user_id: user.id,
      event: 'document_scan',
      metadata: { item_count: lineItems.length },
    }).then(() => {});

    return Response.json({ storeName, receiptDate: formattedDate, lineItems }, { headers: corsHeaders() });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = msg === 'Unauthorized' || msg === 'Missing token' ? 401 : 500;
    return Response.json({ error: msg }, { status, headers: corsHeaders() });
  }
});
