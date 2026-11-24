/** Keeps the displayed score current while earlier rewards are still in flight. */
export class SettlementPlayback<T extends { remaining: number }> {
  private state: T;
  private pendingCards = 0;
  private tasks: Promise<void>[] = [];
  private failed = false;
  private failure: unknown;

  constructor(initial: T, private readonly render: (state: T) => void) {
    this.state = structuredClone(initial);
  }

  show(state: T) {
    this.state = structuredClone(state);
    this.refresh();
  }

  private refresh() {
    const visible = structuredClone(this.state);
    visible.remaining -= this.pendingCards;
    this.render(visible);
  }

  track(task: Promise<unknown>) {
    // Observe failures immediately; the caller drains all visuals before recovery.
    this.tasks.push(task.then(() => {}, error => {
      if (!this.failed) { this.failed = true; this.failure = error; }
    }));
  }

  returnCards(state: T, count: number, animate: (onArrival: () => void) => Promise<void>) {
    this.pendingCards += count;
    this.show(state);
    let arrived = 0;
    this.track(animate(() => {
      if (arrived >= count) return;
      arrived++; this.pendingCards--;
      // Use the newest state, never the older event that launched this reward.
      this.refresh();
    }));
  }

  async finish() {
    await Promise.all(this.tasks);
    if (this.failed) throw this.failure;
  }
}
