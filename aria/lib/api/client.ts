import { supabase } from '../supabase/client';

const BASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '') + '/functions/v1';

export async function apiPost(path: string, body: object | FormData): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const isFormData = body instanceof FormData;
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(errorBody.error ?? 'API error');
  }
  return res;
}
