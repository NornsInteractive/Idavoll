export interface JWTPayload {
  sub: string;
  exp: number;
  kind: 'auth' | 'room';
  roomId?: string;
  jti?: string;
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

export async function signJWT(payload: Omit<JWTPayload, 'exp'>, secret: string, expiresInSeconds = 604800): Promise<string> {
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  const encoder = new TextEncoder();
  const data = `${encode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))}.${encode(encoder.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds })))}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `${data}.${encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data))))}`;
}

export async function verifyJWT(token: string, secret: string, kind: JWTPayload['kind'] = 'auth'): Promise<JWTPayload | null> {
  try {
    if (!secret || secret.length < 32) return null;
    const [header, body, signature, extra] = token.split('.');
    if (!header || !body || !signature || extra) return null;
    const decoder = new TextDecoder();
    const parsedHeader = JSON.parse(decoder.decode(decode(header)));
    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, decode(signature), encoder.encode(`${header}.${body}`))) return null;
    const payload = JSON.parse(decoder.decode(decode(body)));
    if (typeof payload.sub !== 'string' || !payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000) || payload.kind !== kind) return null;
    if (kind === 'room' && (typeof payload.roomId !== 'string' || typeof payload.jti !== 'string')) return null;
    return payload;
  } catch {
    return null;
  }
}
