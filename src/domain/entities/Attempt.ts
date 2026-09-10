import { AttemptState, AttemptStateMachine } from '../state-machine/AttemptStateMachine';
import { Submission } from './Submission';
import { Evaluation } from './Evaluation';
import { ValidationError, DomainError } from '../exceptions/DomainExceptions';
import { ISubmissionPayload } from '../contracts/ISubmissionPayload';

export interface AttemptProps {
  id: string;
  problemId: string;
  learnerId: string;
  attemptNumber?: number;
  parentAttemptId?: string;
  initialState?: AttemptState;
  submission?: Submission;
  prefilledPayload?: Record<string, unknown> | null;
  evaluation?: Evaluation;
  failureReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Attempt {
  public readonly id: string;
  public readonly problemId: string;
  public readonly learnerId: string;
  public readonly attemptNumber: number;
  public readonly parentAttemptId?: string;
  public readonly prefilledPayload?: Record<string, unknown> | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  private readonly stateMachine: AttemptStateMachine;
  private _submission?: Submission;
  private _evaluation?: Evaluation;
  private _failureReason?: string;

  constructor(props: AttemptProps) {
    if (!props.id) throw new ValidationError(['Attempt ID is required']);
    if (!props.problemId) throw new ValidationError(['Problem ID is required']);
    if (!props.learnerId) throw new ValidationError(['Learner ID is required']);

    this.id = props.id;
    this.problemId = props.problemId;
    this.learnerId = props.learnerId;
    this.attemptNumber = props.attemptNumber || 1;
    this.parentAttemptId = props.parentAttemptId;
    this.prefilledPayload = props.prefilledPayload || null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    this.stateMachine = new AttemptStateMachine(props.initialState || 'DRAFT');
    this._submission = props.submission;
    this._evaluation = props.evaluation;
    this._failureReason = props.failureReason;
  }

  public get state(): AttemptState {
    return this.stateMachine.currentState;
  }

  public get submission(): Submission | undefined {
    return this._submission;
  }

  public get evaluation(): Evaluation | undefined {
    return this._evaluation;
  }

  public get failureReason(): string | undefined {
    return this._failureReason;
  }

  public get stateHistory() {
    return this.stateMachine.history;
  }

  /**
   * Submits a solution for this attempt.
   * Enforces transition from DRAFT to SUBMITTED and binds the submission.
   */
  public submit(submission: Submission): void {
    if (!submission) {
      throw new ValidationError(['Submission cannot be null or undefined']);
    }
    if (submission.attemptId !== this.id) {
      throw new ValidationError([
        `Submission attemptId '${submission.attemptId}' does not match Attempt id '${this.id}'`,
      ]);
    }

    this.stateMachine.transitionTo('SUBMITTED', 'Learner submitted solution');
    this._submission = submission;
    this.updatedAt = new Date();
  }

  /**
   * Starts evaluation of this attempt.
   * Enforces transition from SUBMITTED or FAILED to EVALUATING.
   */
  public startEvaluation(): void {
    this.stateMachine.transitionTo('EVALUATING', 'Evaluation started');
    this._failureReason = undefined;
    this.updatedAt = new Date();
  }

  /**
   * Marks evaluation as successfully completed.
   * Enforces transition from EVALUATING to COMPLETED and records evaluation result.
   */
  public completeEvaluation(evaluation: Evaluation): void {
    if (!evaluation) {
      throw new ValidationError(['Evaluation result cannot be null or undefined']);
    }
    if (evaluation.attemptId !== this.id) {
      throw new ValidationError([
        `Evaluation attemptId '${evaluation.attemptId}' does not match Attempt id '${this.id}'`,
      ]);
    }

    this.stateMachine.transitionTo('COMPLETED', 'Evaluation completed successfully');
    this._evaluation = evaluation;
    this.updatedAt = new Date();
  }

  /**
   * Marks evaluation as failed.
   * Enforces transition from EVALUATING to FAILED and records the failure reason.
   */
  public failEvaluation(reason: string): void {
    const errorMsg = reason?.trim() || 'Unknown evaluation error';
    this.stateMachine.transitionTo('FAILED', errorMsg);
    this._failureReason = errorMsg;
    this.updatedAt = new Date();
  }

  /**
   * Retries evaluation if the previous attempt failed.
   */
  public retryEvaluation(): void {
    this.stateMachine.transitionTo('EVALUATING', 'Retrying evaluation from failed state');
    this._failureReason = undefined;
    this.updatedAt = new Date();
  }

  /**
   * Creates a NEW Attempt (e.g. Attempt #2) linked to this attempt.
   * Encapsulates the Retry / Progression requirement.
   */
  public createRetryAttempt(newAttemptId: string): Attempt {
    if (this.state !== 'COMPLETED' && this.state !== 'FAILED') {
      throw new DomainError(
        `Cannot retry an attempt that is currently in '${this.state}'. Only completed or failed attempts can be retried.`
      );
    }

    return new Attempt({
      id: newAttemptId,
      problemId: this.problemId,
      learnerId: this.learnerId,
      attemptNumber: this.attemptNumber + 1,
      parentAttemptId: this.id,
      initialState: 'DRAFT',
      prefilledPayload: this._submission ? this._submission.payload.serialize() : this.prefilledPayload,
    });
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      problemId: this.problemId,
      learnerId: this.learnerId,
      attemptNumber: this.attemptNumber,
      parentAttemptId: this.parentAttemptId,
      state: this.state,
      submission: this._submission ? this._submission.toJSON() : null,
      prefilledPayload:
        this.prefilledPayload ||
        (this._submission ? this._submission.payload.serialize() : null),
      evaluation: this._evaluation ? this._evaluation.toJSON() : null,
      failureReason: this._failureReason || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
