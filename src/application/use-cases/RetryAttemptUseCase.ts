import { IAttemptRepository } from '../../domain/repositories/IAttemptRepository';
import { Attempt } from '../../domain/entities/Attempt';
import { EntityNotFoundError } from '../../domain/exceptions/DomainExceptions';

export class RetryAttemptUseCase {
  constructor(private readonly attemptRepo: IAttemptRepository) {}

  public async execute(previousAttemptId: string): Promise<Attempt> {
    const previousAttempt = await this.attemptRepo.findById(previousAttemptId);
    if (!previousAttempt) {
      throw new EntityNotFoundError('Attempt', previousAttemptId);
    }

    const newAttemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newAttempt = previousAttempt.createRetryAttempt(newAttemptId);

    await this.attemptRepo.save(newAttempt);
    return newAttempt;
  }
}
