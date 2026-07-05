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

    const openAiForm = new FormData();
    openAiForm.append('file', audio, audio.name || 'recording.m4a');
    openAiForm.append('model', 'gpt-4o-transcribe');
    // No language hint — auto-detect supports 99 languages including code-switching

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    let oaiResponse: Response;
    try {
      oaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: openAiForm,
        signal: controller.signal,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return Response.json(
        { error: isTimeout ? 'Transcription timed out — try a shorter recording' : 'Transcription failed' },
        { status: 504, headers: corsHeaders() }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!oaiResponse.ok) {
      console.error('OpenAI transcription error:', oaiResponse.status, await oaiResponse.text());
      return Response.json({ error: 'Transcription failed' }, { status: 502, headers: corsHeaders() });
    }

    const oaiData = await oaiResponse.json();
    const transcript = oaiData.text ?? '';

    supabase.from('usage_events').insert({
      user_id: user.id,
      event: 'voice_transcribe',
      metadata: { bytes: audio.size },
    }).then(() => {});

    return Response.json({ transcript }, { headers: corsHeaders() });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = msg === 'Unauthorized' || msg === 'Missing token' ? 401 : 500;
    return Response.json({ error: msg }, { status, headers: corsHeaders() });
  }
});
