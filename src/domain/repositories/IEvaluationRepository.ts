import { Evaluation } from '../entities/Evaluation';

export interface IEvaluationRepository {
  save(evaluation: Evaluation): Promise<void>;
  findById(id: string): Promise<Evaluation | null>;
  findByAttemptId(attemptId: string): Promise<Evaluation | null>;
}
