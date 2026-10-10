import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('../apps/web/src/store/useUserStore', () => ({
  useUserStore: { getState: () => ({ token: null }) },
}));

import { API_BASE, api, guestLogin } from '../apps/web/src/services/api';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('AbortSignal', { timeout: undefined });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('logs in without AbortSignal.timeout and clears the request timer', async () => {
  const result = { user: { id: 'player', nickname: 'LuckyFox', avatar: 'avatar.svg' }, token: 'test-token' };
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(result)));
  await expect(guestLogin('LuckyFox', 'avatar.svg')).resolves.toEqual(result);
  expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE}/auth/guest`, expect.objectContaining({
    method: 'POST', body: JSON.stringify({ nickname: 'LuckyFox', avatar: 'avatar.svg' }),
    signal: expect.objectContaining({ aborted: false }),
  }));
  expect(vi.getTimerCount()).toBe(0);
});

it('aborts a stalled request after 15 seconds without AbortSignal.timeout', async () => {
  let signal!: AbortSignal;
  vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    signal = options!.signal!;
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const pending = expect(api('/me')).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(14999);
  expect(signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await pending;
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it('preserves network errors and clears the timer on failure', async () => {
  const failure = new TypeError('Network request failed');
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(failure);
  await expect(api('/rooms')).rejects.toBe(failure);
  expect(vi.getTimerCount()).toBe(0);
});
