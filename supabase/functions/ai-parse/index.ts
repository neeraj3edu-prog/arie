import Anthropic from 'npm:@anthropic-ai/sdk';
import { validateRequest, checkRateLimit, corsHeaders } from '../_shared/auth.ts';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const RATE_LIMIT = 200;

const TASK_SYSTEM = `You extract individual tasks from a voice transcript.
Return ONLY valid JSON with no markdown.

Rules:
- SPLIT on clearly different activities (different verb + different goal)
- DO NOT SPLIT items in the same activity ("buy milk, bread, eggs" = 1 task)
- Remove filler words: um, uh, like, basically
- Capitalize first letter; keep wording natural
- Do not invent tasks not mentioned

Output: { "tasks": ["task one", "task two"] }`;

const EXPENSE_SYSTEM = `You extract expenses from a voice transcript.
Return ONLY valid JSON with no markdown.

Rules:
- Extract every item with its price
- Amount = integer cents ($3.50 = 350), if no amount use 0
- Category: groceries | dining | transport | shopping | health | entertainment | utilities | other
- Store: extract if mentioned ("at Walmart" → "Walmart")

Output: { "expenses": [{ "item": "Milk", "amount": 350, "store": "Walmart", "category": "groceries" }] }`;

const SCAN_SYSTEM = `You receive line items from a receipt scan.
Assign the correct category to each item and normalize the description.
Return ONLY valid JSON with no markdown.

Category options: groceries | dining | transport | shopping | health | entertainment | utilities | other

Output: { "expenses": [{ "item": "Whole Milk 1gal", "amount": 349, "category": "groceries" }] }`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const { user, supabase } = await validateRequest(req);

    if (!(await checkRateLimit(supabase, user.id, 'ai_parse', RATE_LIMIT))) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });
    }

    const body = await req.json() as { mode?: string; transcript?: string; lineItems?: unknown[] };
    const { mode, transcript, lineItems } = body;

    if (!['tasks', 'expenses', 'scan'].includes(mode ?? '')) {
      return Response.json({ error: 'Invalid mode' }, { status: 400, headers: corsHeaders() });
    }

    let systemPrompt: string;
    let userContent: string;

    if (mode === 'tasks') {
      systemPrompt = TASK_SYSTEM;
      userContent = `Extract tasks from: "${(transcript ?? '').slice(0, 3000)}"`;
    } else if (mode === 'expenses') {
      systemPrompt = EXPENSE_SYSTEM;
      userContent = `Extract expenses from: "${(transcript ?? '').slice(0, 3000)}"`;
    } else {
      systemPrompt = SCAN_SYSTEM;
      userContent = `Categorize these receipt items: ${JSON.stringify(lineItems ?? [])}`;
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleaned = rawText.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    supabase.from('usage_events').insert({
      user_id: user.id,
      event: 'ai_parse',
      metadata: { mode, input_tokens: message.usage.input_tokens },
    }).then(() => {});

    return Response.json(parsed, { headers: corsHeaders() });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = msg === 'Unauthorized' || msg === 'Missing token' ? 401 : 500;
    return Response.json({ error: msg }, { status, headers: corsHeaders() });
  }
});
