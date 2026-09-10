import { Submission } from '../entities/Submission';

export interface ISubmissionRepository {
  save(submission: Submission): Promise<void>;
  findById(id: string): Promise<Submission | null>;
  findByAttemptId(attemptId: string): Promise<Submission | null>;
}
