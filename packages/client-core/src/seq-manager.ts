export class SequenceManager {
  private lastProcessedSeq = 0;
  private pendingBuffer: Map<number, unknown> = new Map();

  reset(startSeq = 0) {
    this.lastProcessedSeq = startSeq;
    this.pendingBuffer.clear();
  }

  processMessage<T extends { seq?: number }>(
    msg: T,
    onReady: (orderedMsg: T) => void
  ): boolean {
    if (typeof msg.seq !== 'number') {
      onReady(msg);
      return true;
    }

    const { seq } = msg;

    // Duplicate message, drop
    if (seq <= this.lastProcessedSeq) {
      return false;
    }

    // Expected next in sequence
    if (seq === this.lastProcessedSeq + 1) {
      this.lastProcessedSeq = seq;
      onReady(msg);

      // Drain buffered consecutive messages
      while (this.pendingBuffer.has(this.lastProcessedSeq + 1)) {
        const nextSeq = this.lastProcessedSeq + 1;
        const buffered = this.pendingBuffer.get(nextSeq) as T;
        this.pendingBuffer.delete(nextSeq);
        this.lastProcessedSeq = nextSeq;
        onReady(buffered);
      }
      return true;
    }

    // Out of order, buffer
    if (this.pendingBuffer.size < 500) {
      this.pendingBuffer.set(seq, msg);
    }
    return false;
  }

  getLastSeq(): number {
    return this.lastProcessedSeq;
  }
}
