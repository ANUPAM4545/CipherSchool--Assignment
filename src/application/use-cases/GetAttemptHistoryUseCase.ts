import { IAttemptRepository } from '../../domain/repositories/IAttemptRepository';
import { Attempt } from '../../domain/entities/Attempt';

export class GetAttemptHistoryUseCase {
  constructor(private readonly attemptRepo: IAttemptRepository) {}

  public async execute(problemId: string, learnerId: string): Promise<Attempt[]> {
    return await this.attemptRepo.findByProblemAndLearner(problemId, learnerId);
  }
}
