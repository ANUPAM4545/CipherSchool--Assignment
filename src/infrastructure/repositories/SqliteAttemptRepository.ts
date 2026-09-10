import Database from 'better-sqlite3';
import { Attempt } from '../../domain/entities/Attempt';
import { AttemptState } from '../../domain/state-machine/AttemptStateMachine';
import { IAttemptRepository } from '../../domain/repositories/IAttemptRepository';
import { ISubmissionRepository } from '../../domain/repositories/ISubmissionRepository';
import { IEvaluationRepository } from '../../domain/repositories/IEvaluationRepository';

interface AttemptRow {
  id: string;
  problem_id: string;
  learner_id: string;
  attempt_number: number;
  parent_attempt_id: string | null;
  state: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteAttemptRepository implements IAttemptRepository {
  constructor(
    private readonly db: Database.Database,
    private readonly submissionRepo: ISubmissionRepository,
    private readonly evaluationRepo: IEvaluationRepository
  ) {}

  public async findById(id: string): Promise<Attempt | null> {
    const row = this.db
      .prepare('SELECT * FROM attempts WHERE id = ?')
      .get(id) as AttemptRow | undefined;

    return row ? this.mapRowToAttempt(row) : null;
  }

  public async findByProblemAndLearner(
    problemId: string,
    learnerId: string
  ): Promise<Attempt[]> {
    const rows = this.db
      .prepare(
        'SELECT * FROM attempts WHERE problem_id = ? AND learner_id = ? ORDER BY attempt_number ASC'
      )
      .all(problemId, learnerId) as AttemptRow[];

    return Promise.all(rows.map((r) => this.mapRowToAttempt(r)));
  }

  public async findLatestByProblemAndLearner(
    problemId: string,
    learnerId: string
  ): Promise<Attempt | null> {
    const row = this.db
      .prepare(
        'SELECT * FROM attempts WHERE problem_id = ? AND learner_id = ? ORDER BY attempt_number DESC LIMIT 1'
      )
      .get(problemId, learnerId) as AttemptRow | undefined;

    return row ? this.mapRowToAttempt(row) : null;
  }

  public async save(attempt: Attempt): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO attempts (
        id, problem_id, learner_id, attempt_number, parent_attempt_id,
        state, failure_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        failure_reason = excluded.failure_reason,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      attempt.id,
      attempt.problemId,
      attempt.learnerId,
      attempt.attemptNumber,
      attempt.parentAttemptId || null,
      attempt.state,
      attempt.failureReason || null,
      attempt.createdAt.toISOString(),
      attempt.updatedAt.toISOString()
    );

    // Save associated submission if present
    if (attempt.submission) {
      await this.submissionRepo.save(attempt.submission);
    }

    // Save associated evaluation if present
    if (attempt.evaluation) {
      await this.evaluationRepo.save(attempt.evaluation);
    }
  }

  private async mapRowToAttempt(row: AttemptRow): Promise<Attempt> {
    const [submission, evaluation] = await Promise.all([
      this.submissionRepo.findByAttemptId(row.id),
      this.evaluationRepo.findByAttemptId(row.id),
    ]);

    let prefilledPayload: Record<string, unknown> | null = null;
    if (!submission && row.parent_attempt_id) {
      const parentSubmission = await this.submissionRepo.findByAttemptId(row.parent_attempt_id);
      if (parentSubmission) {
        prefilledPayload = parentSubmission.payload.serialize();
      }
    }

    return new Attempt({
      id: row.id,
      problemId: row.problem_id,
      learnerId: row.learner_id,
      attemptNumber: row.attempt_number,
      parentAttemptId: row.parent_attempt_id || undefined,
      initialState: row.state as AttemptState,
      submission: submission || undefined,
      prefilledPayload: prefilledPayload || (submission ? submission.payload.serialize() : null),
      evaluation: evaluation || undefined,
      failureReason: row.failure_reason || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
