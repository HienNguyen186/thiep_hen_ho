const encoder = new TextEncoder();

export async function passwordMatches(candidate: string, expected: string) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  // Cloudflare's native constant-time comparison avoids password-dependent timing.
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean };
  return subtle.timingSafeEqual(left, right);
}

export async function hash(value: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export function newToken() { return hex(crypto.getRandomValues(new Uint8Array(32))); }

export async function sessionHash(token: string, password: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  // Changing the admin secret invalidates all existing sessions without a DB reset.
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(token)));
}

function hex(buffer: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(buffer), value => value.toString(16).padStart(2, '0')).join(''); }

export function sessionCookie(request: Request, token: string, clear = false) {
  const secure = new URL(request.url).protocol === 'https:';
  const name = secure ? '__Host-date_session' : 'date_session';
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 8 * 60 * 60}${secure ? '; Secure' : ''}`;
}

export function readToken(request: Request) {
  const name = new URL(request.url).protocol === 'https:' ? '__Host-date_session' : 'date_session';
  const value = (request.headers.get('Cookie') ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
  return /^[a-f0-9]{64}$/.test(value) ? value : '';
}

export function securityHeaders(request: Request) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return headers;
}
