import { InvalidStateTransitionError } from '../exceptions/DomainExceptions';

export type AttemptState = 'DRAFT' | 'SUBMITTED' | 'EVALUATING' | 'COMPLETED' | 'FAILED';

export interface StateTransitionRecord {
  readonly fromState: AttemptState;
  readonly toState: AttemptState;
  readonly timestamp: Date;
  readonly reason?: string;
}

export class AttemptStateMachine {
  private static readonly VALID_TRANSITIONS: Record<AttemptState, AttemptState[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['EVALUATING'],
    EVALUATING: ['COMPLETED', 'FAILED'],
    COMPLETED: [], // Terminal state
    FAILED: ['EVALUATING'], // Retry evaluation allowed
  };

  private _currentState: AttemptState;
  private readonly _history: StateTransitionRecord[] = [];

  constructor(initialState: AttemptState = 'DRAFT') {
    this._currentState = initialState;
  }

  public get currentState(): AttemptState {
    return this._currentState;
  }

  public get history(): ReadonlyArray<StateTransitionRecord> {
    return [...this._history];
  }

  public canTransitionTo(targetState: AttemptState): boolean {
    const allowed = AttemptStateMachine.VALID_TRANSITIONS[this._currentState];
    return allowed.includes(targetState);
  }

  public transitionTo(targetState: AttemptState, reason?: string): void {
    if (!this.canTransitionTo(targetState)) {
      throw new InvalidStateTransitionError(
        this._currentState,
        targetState,
        `Allowed transitions from '${this._currentState}' are: [${AttemptStateMachine.VALID_TRANSITIONS[this._currentState].join(', ')}]`
      );
    }

    const record: StateTransitionRecord = {
      fromState: this._currentState,
      toState: targetState,
      timestamp: new Date(),
      reason,
    };

    this._currentState = targetState;
    this._history.push(record);
  }
}
