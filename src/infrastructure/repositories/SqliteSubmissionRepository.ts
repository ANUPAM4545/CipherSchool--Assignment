import Database from 'better-sqlite3';
import { Submission } from '../../domain/entities/Submission';
import { StructuredTextPayload } from '../../domain/payloads/StructuredTextPayload';
import { CodeSubmissionPayload } from '../../domain/payloads/CodeSubmissionPayload';
import { ISubmissionPayload } from '../../domain/contracts/ISubmissionPayload';
import { ISubmissionRepository } from '../../domain/repositories/ISubmissionRepository';

interface SubmissionRow {
  id: string;
  attempt_id: string;
  format: string;
  payload_json: string;
  content_hash: string;
  submitted_at: string;
}

export class SqliteSubmissionRepository implements ISubmissionRepository {
  constructor(private readonly db: Database.Database) {}

  public async findById(id: string): Promise<Submission | null> {
    const row = this.db
      .prepare('SELECT * FROM submissions WHERE id = ?')
      .get(id) as SubmissionRow | undefined;

    return row ? this.mapRowToSubmission(row) : null;
  }

  public async findByAttemptId(attemptId: string): Promise<Submission | null> {
    const row = this.db
      .prepare('SELECT * FROM submissions WHERE attempt_id = ?')
      .get(attemptId) as SubmissionRow | undefined;

    return row ? this.mapRowToSubmission(row) : null;
  }

  public async save(submission: Submission): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO submissions (id, attempt_id, format, payload_json, content_hash, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(attempt_id) DO UPDATE SET
        payload_json = excluded.payload_json,
        content_hash = excluded.content_hash,
        submitted_at = excluded.submitted_at
    `);

    stmt.run(
      submission.id,
      submission.attemptId,
      submission.payload.format,
      JSON.stringify(submission.payload.serialize()),
      submission.contentHash,
      submission.submittedAt.toISOString()
    );
  }

  private mapRowToSubmission(row: SubmissionRow): Submission {
    let payload: ISubmissionPayload;
    const parsed = JSON.parse(row.payload_json);

    if (row.format === StructuredTextPayload.FORMAT) {
      payload = StructuredTextPayload.fromJSON(parsed);
    } else if (row.format === CodeSubmissionPayload.FORMAT) {
      payload = CodeSubmissionPayload.fromJSON(parsed);
    } else {
      // Fallback for custom or future formats
      payload = StructuredTextPayload.fromJSON(parsed);
    }

    return new Submission({
      id: row.id,
      attemptId: row.attempt_id,
      payload,
      contentHash: row.content_hash,
      submittedAt: new Date(row.submitted_at),
    });
  }
}
