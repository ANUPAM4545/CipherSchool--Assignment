import Database from 'better-sqlite3';
import { getDatabase } from './sqlite';
import { initializeSchema } from './schema';
import { seedProblems } from './seeds';
import { SqliteProblemRepository } from '../repositories/SqliteProblemRepository';
import { SqliteSubmissionRepository } from '../repositories/SqliteSubmissionRepository';
import { SqliteEvaluationRepository } from '../repositories/SqliteEvaluationRepository';
import { SqliteAttemptRepository } from '../repositories/SqliteAttemptRepository';

export interface RepositoryContainer {
  db: Database.Database;
  problemRepo: SqliteProblemRepository;
  submissionRepo: SqliteSubmissionRepository;
  evaluationRepo: SqliteEvaluationRepository;
  attemptRepo: SqliteAttemptRepository;
}

let containerInstance: RepositoryContainer | null = null;

export async function getRepositoryContainer(dbPath?: string): Promise<RepositoryContainer> {
  if (containerInstance && !dbPath) {
    return containerInstance;
  }

  const db = getDatabase(dbPath);
  initializeSchema(db);

  const problemRepo = new SqliteProblemRepository(db);
  const submissionRepo = new SqliteSubmissionRepository(db);
  const evaluationRepo = new SqliteEvaluationRepository(db);
  const attemptRepo = new SqliteAttemptRepository(db, submissionRepo, evaluationRepo);

  // Auto-seed problem catalog if empty
  await seedProblems(problemRepo);

  const container: RepositoryContainer = {
    db,
    problemRepo,
    submissionRepo,
    evaluationRepo,
    attemptRepo,
  };

  if (!dbPath) {
    containerInstance = container;
  }

  return container;
}
