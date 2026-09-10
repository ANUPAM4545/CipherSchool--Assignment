import Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      difficulty TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'LLD',
      short_description TEXT NOT NULL,
      functional_requirements TEXT NOT NULL,
      non_functional_requirements TEXT NOT NULL,
      constraints TEXT NOT NULL,
      concepts_practiced TEXT NOT NULL,
      rubric_dimensions TEXT NOT NULL,
      coding_config TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL REFERENCES problems(id),
      learner_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      parent_attempt_id TEXT,
      state TEXT NOT NULL,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(parent_attempt_id) REFERENCES attempts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_problem_learner ON attempts(problem_id, learner_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON attempts(created_at);

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL UNIQUE REFERENCES attempts(id),
      format TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      submitted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_attempt ON submissions(attempt_id);

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL UNIQUE REFERENCES attempts(id),
      evaluator_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      criteria_json TEXT NOT NULL,
      total_score INTEGER NOT NULL,
      max_total_score INTEGER NOT NULL,
      average_score REAL NOT NULL,
      overall_rating TEXT NOT NULL,
      execution_result_json TEXT,
      evaluated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_evaluations_attempt ON evaluations(attempt_id);
  `);

  // Idempotent column migrations for existing databases
  const problemColumns = db.pragma('table_info(problems)') as Array<{ name: string }>;
  if (!problemColumns.some((c) => c.name === 'type')) {
    db.exec(`ALTER TABLE problems ADD COLUMN type TEXT NOT NULL DEFAULT 'LLD';`);
  }
  if (!problemColumns.some((c) => c.name === 'coding_config')) {
    db.exec(`ALTER TABLE problems ADD COLUMN coding_config TEXT;`);
  }

  const evalColumns = db.pragma('table_info(evaluations)') as Array<{ name: string }>;
  if (!evalColumns.some((c) => c.name === 'execution_result_json')) {
    db.exec(`ALTER TABLE evaluations ADD COLUMN execution_result_json TEXT;`);
  }
}
