import { afterEach, expect, it, vi } from 'vitest';
import { GameConnection } from '../packages/client-core/src/connection';
import { Transport } from '../packages/game-sdk/src';

function socket() {
  let open = () => {};
  let close = (_code: number, _reason: string) => {};
  let message = (_raw: string) => {};
  const transport: Transport = {
    send: vi.fn(), close: vi.fn(),
    onOpen: fn => { open = fn; return () => { open = () => {}; }; },
    onClose: fn => { close = fn; return () => { close = () => {}; }; },
    onMessage: fn => { message = fn; return () => { message = () => {}; }; },
  };
  return { transport, open: () => open(), close: (code: number) => close(code, ''), message: (seq: number) => message(JSON.stringify({ topic: 'snapshot', payload: seq, seq })) };
}
afterEach(() => vi.useRealTimers());

it('socket 在发送瞬间断开时返回失败，关闭旧连接并仅创建一个重连', async () => {
  vi.useFakeTimers();
  const first = socket();
  const second = socket();
  const factory = vi.fn().mockReturnValueOnce(first.transport).mockReturnValue(second.transport);
  const connection = new GameConnection({ transportFactory: factory, initialBackoffMs: 1 });
  connection.connect(); first.open();
  vi.mocked(first.transport.send).mockImplementation(() => { throw new Error('Socket closed'); });
  expect(connection.send('chat:send', {})).toBe(false);
  expect(connection.getState()).toBe('reconnecting');
  expect(first.transport.close).toHaveBeenCalledOnce();
  first.close(1006);
  await vi.advanceTimersByTimeAsync(501);
  expect(factory).toHaveBeenCalledTimes(2);
  second.open();
  expect(connection.send('chat:send', {})).toBe(true);
  connection.disconnect();
});

it('重连后的序号从1重新接收，重复登录关闭不重连', async () => {
  vi.useFakeTimers();
  const first = socket(); const second = socket();
  const factory = vi.fn().mockReturnValueOnce(first.transport).mockReturnValue(second.transport);
  const connection = new GameConnection({ transportFactory: factory, initialBackoffMs: 1 });
  const received = vi.fn(); connection.onMessage(received);
  connection.connect(); first.open(); first.message(1); first.message(2);
  first.close(1006);
  await vi.advanceTimersByTimeAsync(501);
  second.open(); second.message(1);
  expect(received.mock.calls.map(call => call[1])).toEqual([1, 2, 1]);
  second.close(4001);
  await vi.advanceTimersByTimeAsync(10000);
  expect(connection.getState()).toBe('disconnected');
  expect(factory).toHaveBeenCalledTimes(2);
  connection.disconnect();
});
