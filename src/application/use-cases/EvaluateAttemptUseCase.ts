import { IAttemptRepository } from '../../domain/repositories/IAttemptRepository';
import { IProblemRepository } from '../../domain/repositories/IProblemRepository';
import { IEvaluator } from '../../domain/contracts/IEvaluator';
import { Attempt } from '../../domain/entities/Attempt';
import { EntityNotFoundError, ValidationError } from '../../domain/exceptions/DomainExceptions';

export class EvaluateAttemptUseCase {
  constructor(
    private readonly attemptRepo: IAttemptRepository,
    private readonly problemRepo: IProblemRepository,
    private readonly evaluator: IEvaluator
  ) {}

  public async execute(attemptId: string): Promise<Attempt> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      throw new EntityNotFoundError('Attempt', attemptId);
    }

    if (!attempt.submission) {
      throw new ValidationError([`Attempt '${attemptId}' does not have a submission to evaluate`]);
    }

    const problem = await this.problemRepo.findById(attempt.problemId);
    if (!problem) {
      throw new EntityNotFoundError('Problem', attempt.problemId);
    }

    // 1. Transition to EVALUATING state
    attempt.startEvaluation();
    await this.attemptRepo.save(attempt);

    try {
      // 2. Invoke evaluator
      const evaluation = await this.evaluator.evaluate(
        attempt.submission.payload,
        problem,
        attempt.id
      );

      // 3. On success: Transition to COMPLETED
      attempt.completeEvaluation(evaluation);
      await this.attemptRepo.save(attempt);
      return attempt;
    } catch (err: unknown) {
      // 4. On failure: Transition to FAILED, preserving the submission safely
      const errorMessage =
        err instanceof Error ? err.message : 'Evaluation failed due to an unexpected error';

      attempt.failEvaluation(errorMessage);
      await this.attemptRepo.save(attempt);
      return attempt;
    }
  }
}
