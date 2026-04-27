import { validateRequest, checkRateLimit, corsHeaders } from '../_shared/auth.ts';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const RATE_LIMIT = 20;

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

    const projectId = Deno.env.get('GOOGLE_PROJECT_ID');
    const processorId = Deno.env.get('GOOGLE_DOCAI_EXPENSE_PROCESSOR_ID');
    const accessToken = Deno.env.get('GOOGLE_ACCESS_TOKEN');

    const docAiResponse = await fetch(
      `https://us-documentai.googleapis.com/v1/projects/${projectId}/locations/us/processors/${processorId}:process`,
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

    type Entity = { type: string; mentionText?: string; normalizedValue?: { dateValue?: { year: number; month: number; day: number } }; properties?: Entity[] };
    const docAiData = await docAiResponse.json() as { document?: { entities?: Entity[] } };
    const entities = docAiData.document?.entities ?? [];

    const storeName = entities.find((e) => e.type === 'supplier_name')?.mentionText ?? undefined;
    const receiptDate = entities.find((e) => e.type === 'invoice_date')?.normalizedValue?.dateValue;

    const lineItems = entities
      .filter((e) => e.type === 'line_item')
      .map((item) => {
        const desc = item.properties?.find((p) => p.type === 'line_item/description')?.mentionText;
        const amount = item.properties?.find((p) => p.type === 'line_item/amount')?.mentionText;
        const amountCents = amount
          ? Math.round(parseFloat(amount.replace(/[^0-9.]/g, '')) * 100)
          : 0;
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
