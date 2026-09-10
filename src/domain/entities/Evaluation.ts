import { CriterionFeedback, PerformanceRating } from './CriterionFeedback';
import { ValidationError } from '../exceptions/DomainExceptions';

export interface EvaluationProps {
  id: string;
  attemptId: string;
  evaluatorId: string;
  summary: string;
  criteria: CriterionFeedback[];
  evaluatedAt?: Date;
}

export class Evaluation {
  public readonly id: string;
  public readonly attemptId: string;
  public readonly evaluatorId: string;
  public readonly summary: string;
  public readonly criteria: ReadonlyArray<CriterionFeedback>;
  public readonly evaluatedAt: Date;

  constructor(props: EvaluationProps) {
    if (!props.id) throw new ValidationError(['Evaluation ID is required']);
    if (!props.attemptId) throw new ValidationError(['Attempt ID is required']);
    if (!props.evaluatorId) throw new ValidationError(['Evaluator ID is required']);
    if (!props.summary || props.summary.trim().length === 0) {
      throw new ValidationError(['Evaluation summary is required']);
    }
    if (!props.criteria || props.criteria.length === 0) {
      throw new ValidationError(['Evaluation must contain at least one criterion feedback item']);
    }

    this.id = props.id;
    this.attemptId = props.attemptId;
    this.evaluatorId = props.evaluatorId;
    this.summary = props.summary.trim();
    this.criteria = [...props.criteria];
    this.evaluatedAt = props.evaluatedAt || new Date();
  }

  public get totalScore(): number {
    return this.criteria.reduce((sum, c) => sum + c.score, 0);
  }

  public get maxTotalScore(): number {
    return this.criteria.length * 10;
  }

  public get averageScore(): number {
    return Number((this.totalScore / this.criteria.length).toFixed(1));
  }

  public get overallRating(): PerformanceRating {
    if (this.averageScore >= 8) return 'EXEMPLARY';
    if (this.averageScore >= 5) return 'COMPETENT';
    return 'NEEDS_WORK';
  }

  public getCriterion(criterionName: string): CriterionFeedback | undefined {
    return this.criteria.find(
      (c) => c.criterion.toLowerCase() === criterionName.toLowerCase()
    );
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      attemptId: this.attemptId,
      evaluatorId: this.evaluatorId,
      totalScore: this.totalScore,
      maxTotalScore: this.maxTotalScore,
      averageScore: this.averageScore,
      overallRating: this.overallRating,
      summary: this.summary,
      criteria: this.criteria.map((c) => c.toJSON()),
      evaluatedAt: this.evaluatedAt.toISOString(),
    };
  }
}
