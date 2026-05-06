// Module-level store for the OAuth callback URL.
// _layout.tsx captures it early (before auth/callback screen mounts).
// auth/callback.tsx consumes it when it renders.
let _pendingUrl: string | null = null;

export function setPendingOAuthUrl(url: string): void {
  _pendingUrl = url;
}

export function consumePendingOAuthUrl(): string | null {
  const url = _pendingUrl;
  _pendingUrl = null;
  return url;
}
