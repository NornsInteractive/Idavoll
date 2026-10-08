import { describe, it, expect, vi } from 'vitest';
import { SequenceManager, SimpleStateMachine } from '../packages/client-core/src';

describe('Client Core: SequenceManager', () => {
  it('deduplicates messages with seq <= lastProcessedSeq', () => {
    const seqMgr = new SequenceManager();
    const delivered: any[] = [];

    seqMgr.processMessage({ seq: 1, text: 'First' }, (m) => delivered.push(m));
    expect(delivered.length).toBe(1);

    // Duplicate message
    const isProcessed = seqMgr.processMessage({ seq: 1, text: 'Duplicate' }, (m) => delivered.push(m));
    expect(isProcessed).toBe(false);
    expect(delivered.length).toBe(1);
  });

  it('buffers and flushes out-of-order messages in sequence', () => {
    const seqMgr = new SequenceManager();
    const delivered: any[] = [];

    // Arrives message 3 first (out of order)
    seqMgr.processMessage({ seq: 3, text: 'Three' }, (m) => delivered.push(m));
    expect(delivered.length).toBe(0);

    // Arrives message 1
    seqMgr.processMessage({ seq: 1, text: 'One' }, (m) => delivered.push(m));
    expect(delivered.length).toBe(1);

    // Arrives message 2 -> should flush both 2 and 3!
    seqMgr.processMessage({ seq: 2, text: 'Two' }, (m) => delivered.push(m));
    expect(delivered.length).toBe(3);
    expect(delivered.map((m) => m.seq)).toEqual([1, 2, 3]);
  });
});

describe('Client Core: SimpleStateMachine', () => {
  it('handles state transitions and notifies listeners', () => {
    const sm = new SimpleStateMachine<'idle' | 'drawing' | 'review'>('idle', { round: 1 });
    const listener = vi.fn();

    sm.subscribe(listener);
    sm.transition('drawing', { round: 2 });

    expect(sm.getState()).toBe('drawing');
    expect(sm.getContext().round).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
