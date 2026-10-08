import { Transport } from '@idavoll/game-sdk';
import { SequenceManager } from './seq-manager';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface ConnectionOptions {
  url?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  transportFactory?: () => Transport;
}

export class GameConnection {
  private state: ConnectionState = 'disconnected';
  private transport: Transport | null = null;
  private seqManager = new SequenceManager();
  private stateListeners = new Set<(state: ConnectionState) => void>();
  private messageListeners = new Set<(topic: string, data: unknown) => void>();
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupFns: Array<() => void> = [];

  constructor(private options: ConnectionOptions = {}) {}

  getState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateListeners.forEach((fn) => fn(newState));
    }
  }

  onStateChange(fn: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  onMessage(fn: (topic: string, data: unknown) => void): () => void {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  connect(transport?: Transport) {
    if (this.state === 'connected' || this.state === 'connecting') return;

    this.setState('connecting');
    this.cleanup();

    if (transport) {
      this.transport = transport;
    } else if (this.options.transportFactory) {
      this.transport = this.options.transportFactory();
    }

    if (!this.transport) {
      this.setState('disconnected');
      return;
    }

    const unOpen = this.transport.onOpen(() => {
      this.retryCount = 0;
      this.setState('connected');
    });

    const unClose = this.transport.onClose(() => {
      this.handleDisconnect();
    });

    const unMsg = this.transport.onMessage((rawStr) => {
      try {
        const parsed = JSON.parse(rawStr);
        this.seqManager.processMessage(parsed, (orderedMsg) => {
          const { topic, payload } = orderedMsg as { topic: string; payload: unknown };
          this.messageListeners.forEach((fn) => fn(topic, payload));
        });
      } catch (err) {
        console.error('Failed to parse incoming message:', err);
      }
    });

    this.cleanupFns.push(unOpen, unClose, unMsg);
  }

  send(topic: string, payload: unknown) {
    if (this.state !== 'connected' || !this.transport) {
      return false;
    }
    const message = JSON.stringify({
      topic,
      payload,
      timestamp: Date.now(),
    });
    this.transport.send(message);
    return true;
  }

  private handleDisconnect() {
    this.setState('reconnecting');
    const maxRetries = this.options.maxRetries ?? 5;
    if (this.retryCount >= maxRetries) {
      this.setState('disconnected');
      return;
    }

    const base = this.options.initialBackoffMs ?? 1000;
    const maxBackoff = this.options.maxBackoffMs ?? 10000;
    const delay = Math.min(base * Math.pow(2, this.retryCount), maxBackoff) + Math.random() * 500;
    this.retryCount++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup();
    if (this.transport) {
      this.transport.close(1000, 'User initiated disconnect');
      this.transport = null;
    }
    this.seqManager.reset();
    this.setState('disconnected');
  }

  private cleanup() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
