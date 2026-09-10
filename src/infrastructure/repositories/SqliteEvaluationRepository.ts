import Database from 'better-sqlite3';
import { Evaluation } from '../../domain/entities/Evaluation';
import { CriterionFeedback } from '../../domain/entities/CriterionFeedback';
import { IEvaluationRepository } from '../../domain/repositories/IEvaluationRepository';

interface EvaluationRow {
  id: string;
  attempt_id: string;
  evaluator_id: string;
  summary: string;
  criteria_json: string;
  total_score: number;
  max_total_score: number;
  average_score: number;
  overall_rating: string;
  evaluated_at: string;
}

export class SqliteEvaluationRepository implements IEvaluationRepository {
  constructor(private readonly db: Database.Database) {}

  public async findById(id: string): Promise<Evaluation | null> {
    const row = this.db
      .prepare('SELECT * FROM evaluations WHERE id = ?')
      .get(id) as EvaluationRow | undefined;

    return row ? this.mapRowToEvaluation(row) : null;
  }

  public async findByAttemptId(attemptId: string): Promise<Evaluation | null> {
    const row = this.db
      .prepare('SELECT * FROM evaluations WHERE attempt_id = ?')
      .get(attemptId) as EvaluationRow | undefined;

    return row ? this.mapRowToEvaluation(row) : null;
  }

  public async save(evaluation: Evaluation): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO evaluations (
        id, attempt_id, evaluator_id, summary, criteria_json,
        total_score, max_total_score, average_score, overall_rating, evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(attempt_id) DO UPDATE SET
        summary = excluded.summary,
        criteria_json = excluded.criteria_json,
        total_score = excluded.total_score,
        max_total_score = excluded.max_total_score,
        average_score = excluded.average_score,
        overall_rating = excluded.overall_rating,
        evaluated_at = excluded.evaluated_at
    `);

    stmt.run(
      evaluation.id,
      evaluation.attemptId,
      evaluation.evaluatorId,
      evaluation.summary,
      JSON.stringify(evaluation.criteria.map((c) => c.toJSON())),
      evaluation.totalScore,
      evaluation.maxTotalScore,
      evaluation.averageScore,
      evaluation.overallRating,
      evaluation.evaluatedAt.toISOString()
    );
  }

  private mapRowToEvaluation(row: EvaluationRow): Evaluation {
    const parsedCriteria = JSON.parse(row.criteria_json) as Array<{
      criterion: string;
      score: number;
      evidence: string;
      concern: string;
      suggestion: string;
      confidence: number;
    }>;

    const criteria = parsedCriteria.map((c) => new CriterionFeedback(c));

    return new Evaluation({
      id: row.id,
      attemptId: row.attempt_id,
      evaluatorId: row.evaluator_id,
      summary: row.summary,
      criteria,
      evaluatedAt: new Date(row.evaluated_at),
    });
  }
}
