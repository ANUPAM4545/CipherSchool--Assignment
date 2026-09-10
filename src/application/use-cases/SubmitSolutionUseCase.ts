import { IAttemptRepository } from '../../domain/repositories/IAttemptRepository';
import { ISubmissionPayload } from '../../domain/contracts/ISubmissionPayload';
import { Submission } from '../../domain/entities/Submission';
import { Attempt } from '../../domain/entities/Attempt';
import { EntityNotFoundError, ValidationError } from '../../domain/exceptions/DomainExceptions';

export interface SubmitSolutionInput {
  attemptId: string;
  payload: ISubmissionPayload;
}

export class SubmitSolutionUseCase {
  constructor(private readonly attemptRepo: IAttemptRepository) {}

  public async execute(input: SubmitSolutionInput): Promise<Attempt> {
    const attempt = await this.attemptRepo.findById(input.attemptId);
    if (!attempt) {
      throw new EntityNotFoundError('Attempt', input.attemptId);
    }

    // 1. Validate submission payload
    const validation = input.payload.validateStructure();
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // 2. Create Submission entity
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const submission = new Submission({
      id: submissionId,
      attemptId: attempt.id,
      payload: input.payload,
    });

    // 3. Transition attempt state: DRAFT -> SUBMITTED
    attempt.submit(submission);

    // 4. Save to durable storage BEFORE evaluation
    await this.attemptRepo.save(attempt);

    return attempt;
  }
}
