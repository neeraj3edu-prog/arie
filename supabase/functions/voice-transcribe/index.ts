import { validateRequest, checkRateLimit, corsHeaders } from '../_shared/auth.ts';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const RATE_LIMIT = 50;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const { user, supabase } = await validateRequest(req);

    if (!(await checkRateLimit(supabase, user.id, 'voice_transcribe', RATE_LIMIT))) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders() });
    }

    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    if (!audio) return Response.json({ error: 'No audio provided' }, { status: 400, headers: corsHeaders() });
    if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: 'Audio too large' }, { status: 413, headers: corsHeaders() });

    const dgResponse = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${Deno.env.get('DEEPGRAM_API_KEY')}`,
          // Accept webm from web browsers and m4a from native; Deepgram auto-detects
          'Content-Type': audio.type || 'audio/webm',
        },
        body: await audio.arrayBuffer(),
      }
    );

    if (!dgResponse.ok) {
      console.error('Deepgram error:', await dgResponse.text());
      return Response.json({ error: 'Transcription failed' }, { status: 502, headers: corsHeaders() });
    }

    const dgData = await dgResponse.json();
    const transcript = dgData.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    const duration_ms = Math.round((dgData.metadata?.duration ?? 0) * 1000);

    supabase.from('usage_events').insert({
      user_id: user.id,
      event: 'voice_transcribe',
      metadata: { duration_ms, bytes: audio.size },
    }).then(() => {});

    return Response.json({ transcript, duration_ms }, { headers: corsHeaders() });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = msg === 'Unauthorized' || msg === 'Missing token' ? 401 : 500;
    return Response.json({ error: msg }, { status, headers: corsHeaders() });
  }
});
