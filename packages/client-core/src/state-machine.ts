export type StateListener<T> = (state: T, prevState: T) => void;

export class SimpleStateMachine<TState extends string, TContext = Record<string, unknown>> {
  private currentState: TState;
  private context: TContext;
  private listeners = new Set<StateListener<{ state: TState; context: TContext }>>();

  constructor(initialState: TState, initialContext: TContext) {
    this.currentState = initialState;
    this.context = initialContext;
  }

  getState(): TState {
    return this.currentState;
  }

  getContext(): TContext {
    return this.context;
  }

  transition(nextState: TState, updateContext?: Partial<TContext>) {
    const prevState = { state: this.currentState, context: { ...this.context } };
    this.currentState = nextState;
    if (updateContext) {
      this.context = { ...this.context, ...updateContext };
    }
    const current = { state: this.currentState, context: this.context };
    this.listeners.forEach((listener) => listener(current, prevState));
  }

  updateContext(update: Partial<TContext>) {
    this.context = { ...this.context, ...update };
    const current = { state: this.currentState, context: this.context };
    this.listeners.forEach((listener) => listener(current, current));
  }

  subscribe(listener: StateListener<{ state: TState; context: TContext }>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
