import { ISubmissionPayload } from '../contracts/ISubmissionPayload';
import { ValidationError } from '../exceptions/DomainExceptions';

export interface SubmissionProps {
  id: string;
  attemptId: string;
  payload: ISubmissionPayload;
  submittedAt?: Date;
  contentHash?: string;
}

export class Submission {
  public readonly id: string;
  public readonly attemptId: string;
  public readonly payload: ISubmissionPayload;
  public readonly submittedAt: Date;
  public readonly contentHash: string;

  constructor(props: SubmissionProps) {
    if (!props.id) throw new ValidationError(['Submission ID is required']);
    if (!props.attemptId) throw new ValidationError(['Attempt ID is required']);
    if (!props.payload) throw new ValidationError(['Submission payload is required']);

    const validation = props.payload.validateStructure();
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    this.id = props.id;
    this.attemptId = props.attemptId;
    this.payload = props.payload;
    this.submittedAt = props.submittedAt || new Date();
    this.contentHash = props.contentHash || props.payload.calculateHash();
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      attemptId: this.attemptId,
      format: this.payload.format,
      payload: this.payload.serialize(),
      submittedAt: this.submittedAt.toISOString(),
      contentHash: this.contentHash,
    };
  }
}
