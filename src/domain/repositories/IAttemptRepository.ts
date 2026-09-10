import { Attempt } from '../entities/Attempt';

export interface IAttemptRepository {
  save(attempt: Attempt): Promise<void>;
  findById(id: string): Promise<Attempt | null>;
  findByProblemAndLearner(problemId: string, learnerId: string): Promise<Attempt[]>;
  findLatestByProblemAndLearner(problemId: string, learnerId: string): Promise<Attempt | null>;
}
