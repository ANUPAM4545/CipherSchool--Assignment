import { Problem } from '../entities/Problem';

export interface IProblemRepository {
  findById(id: string): Promise<Problem | null>;
  findBySlug(slug: string): Promise<Problem | null>;
  findAll(): Promise<Problem[]>;
  save(problem: Problem): Promise<void>;
}
