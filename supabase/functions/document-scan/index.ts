// No external imports — plain Deno fetch for everything to avoid boot errors
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
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

async function getGoogleToken(clientEmail: string, privateKeyB64: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const enc = (s: string) =>
    btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const header = enc(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = enc(JSON.stringify(claim));
  const unsigned = `${header}.${payload}`;

  // privateKeyB64 is already the raw base64 content — no headers, no newlines
  const keyStr = privateKeyB64.split(' ').join('').split('\n').join('');

  const binaryKey = Uint8Array.from(atob(keyStr), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  const sig = enc(String.fromCharCode(...new Uint8Array(sigBytes)));
  const jwt = `${unsigned}.${sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await tokenRes.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Google token error: ${data.error}`);
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  try {
    await getUserId(req);

    const fd = await req.formData();
    const image = fd.get('image') as File | null;
    if (!image) return Response.json({ error: 'No image' }, { status: 400, headers: cors() });
    if (image.size > MAX_IMAGE_BYTES) return Response.json({ error: 'Image too large' }, { status: 413, headers: cors() });

    const bytes = new Uint8Array(await image.arrayBuffer());
    // Chunked base64 — spread on large arrays exceeds call stack
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64Image = btoa(binary);

    const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL') ?? '';
    const privateKeyB64 = Deno.env.get('GOOGLE_PRIVATE_KEY_B64') ?? '';
    const processorId = Deno.env.get('GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID') ?? '';

    if (!clientEmail || !privateKeyB64) throw new Error('Google credentials not configured');

    const accessToken = await getGoogleToken(clientEmail, privateKeyB64);

    const docRes = await fetch(
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
      },
    );

    if (!docRes.ok) {
      const txt = await docRes.text();
      console.error('DocAI error:', txt);
      return Response.json({ error: 'DocAI failed', detail: txt }, { status: 502, headers: cors() });
    }

    type Entity = {
      type: string;
      mentionText?: string;
      normalizedValue?: { dateValue?: { year: number; month: number; day: number } };
      properties?: Entity[];
    };
    const doc = await docRes.json() as { document?: { entities?: Entity[] } };
    const entities = doc.document?.entities ?? [];

    const storeName = entities.find((e) => e.type === 'supplier_name')?.mentionText;
    // Log all entity types so we can debug date extraction
    console.log('[document-scan] entity types:', entities.map((e) => `${e.type}:${e.mentionText}`).join(', '));
    // Receipts use receipt_date; formal invoices use invoice_date — check both
    const dateVal =
      entities.find((e) => e.type === 'receipt_date')?.normalizedValue?.dateValue ??
      entities.find((e) => e.type === 'invoice_date')?.normalizedValue?.dateValue ??
      entities.find((e) => e.type === 'purchase_time')?.normalizedValue?.dateValue;
    console.log('[document-scan] dateVal:', JSON.stringify(dateVal));

    const lineItems = entities
      .filter((e) => e.type === 'line_item')
      .flatMap((item) => {
        const desc = item.properties?.find((p) => p.type === 'line_item/description')?.mentionText;
        const amt = item.properties?.find((p) => p.type === 'line_item/amount')?.mentionText;
        if (!desc) return [];
        const amountCents = amt ? Math.round(parseFloat(amt.replace(/[^0-9.]/g, '')) * 100) : 0;
        return [{ description: desc, amountCents }];
      });

    const receiptDate = dateVal
      ? `${dateVal.year}-${String(dateVal.month).padStart(2, '0')}-${String(dateVal.day).padStart(2, '0')}`
      : undefined;

    return Response.json({ storeName, receiptDate, lineItems }, { headers: cors() });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('[document-scan]', msg, stack);
    const status = msg === 'Unauthorized' ? 401 : 500;
    return Response.json({ error: msg, detail: stack }, { status, headers: cors() });
  }
});
