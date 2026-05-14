import { supabase } from '../supabase/client';

const BASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '') + '/functions/v1';

const API_TIMEOUT_MS = 30_000;

export async function apiPost(path: string, body: object | FormData): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const isFormData = body instanceof FormData;
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
      throw new Error(errorBody.error ?? 'API error');
    }
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try a shorter recording.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
