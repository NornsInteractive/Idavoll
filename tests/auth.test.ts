import { describe, it, expect } from 'vitest';
import { signJWT, verifyJWT, JWTPayload } from '../apps/server/src/auth';

const SECRET = 'unit-test-jwt-secret-with-32-chars-min!';

function b64url(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...sig)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function forge(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }, secret = SECRET): Promise<string> {
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  return `${data}.${await hmacSign(data, secret)}`;
}

describe('auth JWT: 中文内容', () => {
  it('携带中文 sub / roomId 的令牌可原样还原', async () => {
    const token = await signJWT(
      { sub: 'usr_中文用户_测试', kind: 'auth' },
      SECRET,
    );
    const claim = await verifyJWT(token, SECRET, 'auth');
    expect(claim).not.toBeNull();
    expect(claim!.sub).toBe('usr_中文用户_测试');
    expect(claim!.kind).toBe('auth');
    expect(claim!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('中文 roomId + jti 的 room 令牌可还原', async () => {
    const token = await signJWT(
      { sub: 'usr_a', kind: 'room', roomId: 'room_中文房间', jti: '票据_中文' },
      SECRET,
      30,
    );
    const claim = await verifyJWT(token, SECRET, 'room');
    expect(claim!.roomId).toBe('room_中文房间');
    expect(claim!.jti).toBe('票据_中文');
  });
});

describe('auth JWT: 失效', () => {
  it('过期令牌被拒绝', async () => {
    const token = await signJWT({ sub: 'usr_a', kind: 'auth' }, SECRET, -60);
    expect(await verifyJWT(token, SECRET, 'auth')).toBeNull();
  });

  it('缺失 / 非数字 exp 被拒绝', async () => {
    const noExp = await forge({ sub: 'usr_a', kind: 'auth' });
    expect(await verifyJWT(noExp, SECRET, 'auth')).toBeNull();

    const stringExp = await forge({ sub: 'usr_a', kind: 'auth', exp: '9999999999' });
    expect(await verifyJWT(stringExp, SECRET, 'auth')).toBeNull();
  });

  it('缺失或空 sub 被拒绝', async () => {
    const noSub = await forge({ kind: 'auth', exp: 9_999_999_999 });
    expect(await verifyJWT(noSub, SECRET, 'auth')).toBeNull();

    const emptySub = await forge({ sub: '', kind: 'auth', exp: 9_999_999_999 });
    expect(await verifyJWT(emptySub, SECRET, 'auth')).toBeNull();
  });

  it('畸形 / 空 / 多段令牌被拒绝', async () => {
    for (const bad of ['', 'abc', 'a.b', 'a.b.c.d', '....', 'earer token']) {
      expect(await verifyJWT(bad, SECRET, 'auth')).toBeNull();
    }
  });

  it('过短的 JWT_SECRET 无法签发且验签返回 null', async () => {
    await expect(signJWT({ sub: 'usr_a', kind: 'auth' }, 'short')).rejects.toThrow(/32/);
    expect(await verifyJWT('a.b.c', 'short', 'auth')).toBeNull();
  });
});

describe('auth JWT: 签名', () => {
  it('篡改 payload 后签名失效', async () => {
    const token = await signJWT({ sub: 'usr_a', kind: 'auth' }, SECRET);
    const [header, body, signature] = token.split('.');
    const tampered = `${header}.${b64url(JSON.stringify({ sub: 'usr_admin', kind: 'auth', exp: 9_999_999_999 }))}.${signature}`;
    expect(await verifyJWT(tampered, SECRET, 'auth')).toBeNull();
  });

  it('篡改签名位被拒绝', async () => {
    const token = await signJWT({ sub: 'usr_a', kind: 'auth' }, SECRET);
    const [header, body] = token.split('.');
    const bad = `${header}.${body}.${'A'.repeat(43)}`;
    expect(await verifyJWT(bad, SECRET, 'auth')).toBeNull();
  });

  it('使用其他密钥签发的令牌被拒绝', async () => {
    const token = await signJWT({ sub: 'usr_a', kind: 'auth' }, 'another-secret-that-is-long-enough-32!!');
    expect(await verifyJWT(token, SECRET, 'auth')).toBeNull();
  });

  it('alg 非 HS256 或 typ 非 JWT 被拒绝', async () => {
    const noneAlg = await forge({ sub: 'usr_a', kind: 'auth', exp: 9_999_999_999 }, { alg: 'none', typ: 'JWT' });
    expect(await verifyJWT(noneAlg, SECRET, 'auth')).toBeNull();

    const badTyp = await forge({ sub: 'usr_a', kind: 'auth', exp: 9_999_999_999 }, { alg: 'HS256', typ: 'JOSE' });
    expect(await verifyJWT(badTyp, SECRET, 'auth')).toBeNull();
  });
});

describe('auth JWT: 用途 (kind) 隔离', () => {
  it('auth 令牌不能当作 room 票据使用', async () => {
    const token = await signJWT({ sub: 'usr_a', kind: 'auth' }, SECRET);
    expect(await verifyJWT(token, SECRET, 'room')).toBeNull();
  });

  it('room 票据不能当作 auth 令牌使用', async () => {
    const token = await signJWT({ sub: 'usr_a', kind: 'room', roomId: 'room_1', jti: 'jti_1' }, SECRET, 30);
    expect(await verifyJWT(token, SECRET, 'auth')).toBeNull();
    expect(await verifyJWT(token, SECRET, 'room')).not.toBeNull();
  });

  it('room 票据缺少 roomId 或 jti 被拒绝', async () => {
    const noRoomId = await signJWT({ sub: 'usr_a', kind: 'room', jti: 'jti_1' }, SECRET, 30);
    expect(await verifyJWT(noRoomId, SECRET, 'room')).toBeNull();

    const noJti = await signJWT({ sub: 'usr_a', kind: 'room', roomId: 'room_1' }, SECRET, 30);
    expect(await verifyJWT(noJti, SECRET, 'room')).toBeNull();
  });

  it('未知 kind 被拒绝', async () => {
    const token = await forge({ sub: 'usr_a', kind: 'service', exp: 9_999_999_999 });
    expect(await verifyJWT(token, SECRET, 'auth' as JWTPayload['kind'])).toBeNull();
  });
});
