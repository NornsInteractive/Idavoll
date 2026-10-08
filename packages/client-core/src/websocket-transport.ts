import { Transport } from '@idavoll/game-sdk';

export class WebSocketTransport implements Transport {
  private socket: WebSocket | null = null;
  private closed = false;
  private messages = new Set<(message: string) => void>();
  private opens = new Set<() => void>();
  private closes = new Set<(code: number, reason: string) => void>();
  constructor(url: () => Promise<string>) {
    void url().then(value => {
      if (this.closed) return;
      const socket = this.socket = new WebSocket(value);
      socket.onopen = () => this.opens.forEach(fn => fn());
      socket.onmessage = event => { if (typeof event.data === 'string') this.messages.forEach(fn => fn(event.data)); };
      socket.onclose = event => this.closes.forEach(fn => fn(event.code, event.reason));
    }).catch(error => {
      if (!this.closed) this.closes.forEach(fn => fn([401, 403, 404, 409, 410].includes((error as { status?: number }).status || 0) ? 4401 : 1006, '连接失败'));
    });
  }
  send(message: string) { if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('连接已断开'); this.socket.send(message); }
  onMessage(fn: (message: string) => void) { this.messages.add(fn); return () => { this.messages.delete(fn); }; }
  onOpen(fn: () => void) { this.opens.add(fn); return () => { this.opens.delete(fn); }; }
  onClose(fn: (code: number, reason: string) => void) { this.closes.add(fn); return () => { this.closes.delete(fn); }; }
  close(code = 1000, reason = 'Closed') { this.closed = true; this.socket?.close(code, reason); }
}
