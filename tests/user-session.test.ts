import { expect, it, vi } from 'vitest';

it('退出或切换身份后，旧资料响应不能恢复旧身份或覆盖当前用户', async () => {
  vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  const { useUserStore } = await import('../apps/web/src/store/useUserStore');
  useUserStore.getState().setUser({ id: 'first', nickname: '甲', avatar: '', token: 'first-token' });
  useUserStore.getState().logout();
  useUserStore.getState().setUser({ id: 'first', nickname: '旧请求', avatar: '' });
  expect(useUserStore.getState().id).toBe('');
  expect(useUserStore.getState().token).toBeNull();
  useUserStore.getState().setUser({ id: 'second', nickname: '乙', avatar: '', token: 'second-token' });
  useUserStore.getState().setUser({ id: 'first', nickname: '旧请求', avatar: '' });
  expect(useUserStore.getState()).toMatchObject({ id: 'second', nickname: '乙', token: 'second-token' });
  useUserStore.getState().logout();
  vi.unstubAllGlobals();
});

it('旧令牌请求的401不注销新登录；当前令牌的401正常注销', async () => {
  vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  const { useUserStore } = await import('../apps/web/src/store/useUserStore');
  const { api } = await import('../apps/web/src/services/api');
  let respond!: (response: Response) => void;
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => new Promise(resolve => { respond = resolve; }));
  useUserStore.getState().setUser({ id: 'first', nickname: '甲', avatar: '', token: 'old-token' });
  const pending = api('/me');
  useUserStore.getState().setUser({ id: 'second', nickname: '乙', avatar: '', token: 'new-token' });
  const expired = () => new Response(JSON.stringify({ error: '已失效' }), { status: 401 });
  respond(expired());
  await expect(pending).rejects.toThrow('已失效');
  expect(useUserStore.getState().token).toBe('new-token');
  fetchSpy.mockResolvedValueOnce(expired());
  await expect(api('/me')).rejects.toThrow('已失效');
  expect(useUserStore.getState().token).toBeNull();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
