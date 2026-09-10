import { IProblemRepository } from '../../domain/repositories/IProblemRepository';
import { IAttemptRepository } from '../../domain/repositories/IAttemptRepository';
import { Attempt } from '../../domain/entities/Attempt';
import { EntityNotFoundError } from '../../domain/exceptions/DomainExceptions';

export interface StartAttemptInput {
  problemId: string;
  learnerId: string;
}

export class StartAttemptUseCase {
  constructor(
    private readonly problemRepo: IProblemRepository,
    private readonly attemptRepo: IAttemptRepository
  ) {}

  public async execute(input: StartAttemptInput): Promise<Attempt> {
    const problem = await this.problemRepo.findById(input.problemId);
    if (!problem) {
      throw new EntityNotFoundError('Problem', input.problemId);
    }

    const previousAttempts = await this.attemptRepo.findByProblemAndLearner(
      input.problemId,
      input.learnerId
    );

    const attemptNumber = previousAttempts.length + 1;
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const attempt = new Attempt({
      id: attemptId,
      problemId: input.problemId,
      learnerId: input.learnerId,
      attemptNumber,
      initialState: 'DRAFT',
    });

    await this.attemptRepo.save(attempt);
    return attempt;
  }
}
