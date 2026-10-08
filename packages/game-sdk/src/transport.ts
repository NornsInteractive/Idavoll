import { Transport } from './types';

export class MemoryTransport implements Transport {
  private peer: MemoryTransport | null = null;
  private messageListeners: Set<(message: string) => void> = new Set();
  private openListeners: Set<() => void> = new Set();
  private closeListeners: Set<(code: number, reason: string) => void> = new Set();

  connectTo(peer: MemoryTransport) {
    this.peer = peer;
    peer.peer = this;
    setTimeout(() => {
      this.openListeners.forEach((fn) => fn());
      peer.openListeners.forEach((fn) => fn());
    }, 0);
  }

  send(message: string): void {
    if (this.peer) {
      setTimeout(() => {
        this.peer?.messageListeners.forEach((fn) => fn(message));
      }, 0);
    }
  }

  onMessage(callback: (message: string) => void): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onOpen(callback: () => void): () => void {
    this.openListeners.add(callback);
    return () => this.openListeners.delete(callback);
  }

  onClose(callback: (code: number, reason: string) => void): () => void {
    this.closeListeners.add(callback);
    return () => this.closeListeners.delete(callback);
  }

  close(code = 1000, reason = 'Normal Closure'): void {
    this.closeListeners.forEach((fn) => fn(code, reason));
    if (this.peer) {
      this.peer.closeListeners.forEach((fn) => fn(code, reason));
      this.peer.peer = null;
      this.peer = null;
    }
  }
}
