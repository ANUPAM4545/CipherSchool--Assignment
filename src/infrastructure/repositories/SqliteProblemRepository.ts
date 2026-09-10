import Database from 'better-sqlite3';
import { Problem, ProblemDifficulty, ProblemType, CodingProblemConfig } from '../../domain/entities/Problem';
import { IProblemRepository } from '../../domain/repositories/IProblemRepository';

interface ProblemRow {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  type?: string;
  short_description: string;
  functional_requirements: string;
  non_functional_requirements: string;
  constraints: string;
  concepts_practiced: string;
  rubric_dimensions: string;
  coding_config?: string | null;
  created_at: string;
}

export class SqliteProblemRepository implements IProblemRepository {
  constructor(private readonly db: Database.Database) {}

  public async findById(id: string): Promise<Problem | null> {
    const row = this.db
      .prepare('SELECT * FROM problems WHERE id = ?')
      .get(id) as ProblemRow | undefined;

    return row ? this.mapRowToProblem(row) : null;
  }

  public async findBySlug(slug: string): Promise<Problem | null> {
    const row = this.db
      .prepare('SELECT * FROM problems WHERE slug = ?')
      .get(slug.toLowerCase()) as ProblemRow | undefined;

    return row ? this.mapRowToProblem(row) : null;
  }

  public async findAll(): Promise<Problem[]> {
    const rows = this.db
      .prepare('SELECT * FROM problems ORDER BY rowid ASC')
      .all() as ProblemRow[];

    return rows.map((r) => this.mapRowToProblem(r));
  }

  public async save(problem: Problem): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO problems (
        id, title, slug, difficulty, type, short_description,
        functional_requirements, non_functional_requirements,
        constraints, concepts_practiced, rubric_dimensions, coding_config, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        slug = excluded.slug,
        difficulty = excluded.difficulty,
        type = excluded.type,
        short_description = excluded.short_description,
        functional_requirements = excluded.functional_requirements,
        non_functional_requirements = excluded.non_functional_requirements,
        constraints = excluded.constraints,
        concepts_practiced = excluded.concepts_practiced,
        rubric_dimensions = excluded.rubric_dimensions,
        coding_config = excluded.coding_config
    `);

    stmt.run(
      problem.id,
      problem.title,
      problem.slug,
      problem.difficulty,
      problem.type,
      problem.shortDescription,
      JSON.stringify(problem.functionalRequirements),
      JSON.stringify(problem.nonFunctionalRequirements),
      JSON.stringify(problem.constraints),
      JSON.stringify(problem.conceptsPracticed),
      JSON.stringify(problem.rubricDimensions),
      problem.codingConfig ? JSON.stringify(problem.codingConfig) : null,
      problem.createdAt.toISOString()
    );
  }

  private mapRowToProblem(row: ProblemRow): Problem {
    return new Problem({
      id: row.id,
      title: row.title,
      slug: row.slug,
      difficulty: row.difficulty as ProblemDifficulty,
      type: (row.type as ProblemType) || 'LLD',
      shortDescription: row.short_description,
      functionalRequirements: JSON.parse(row.functional_requirements),
      nonFunctionalRequirements: JSON.parse(row.non_functional_requirements),
      constraints: JSON.parse(row.constraints),
      conceptsPracticed: JSON.parse(row.concepts_practiced),
      rubricDimensions: JSON.parse(row.rubric_dimensions),
      codingConfig: row.coding_config ? (JSON.parse(row.coding_config) as CodingProblemConfig) : undefined,
      createdAt: new Date(row.created_at),
    });
  }
}
