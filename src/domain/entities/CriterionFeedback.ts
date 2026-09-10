import { ValidationError } from '../exceptions/DomainExceptions';

export type PerformanceRating = 'NEEDS_WORK' | 'COMPETENT' | 'EXEMPLARY';

export interface CriterionFeedbackProps {
  criterion: string;
  score: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

export class CriterionFeedback {
  public readonly criterion: string;
  public readonly score: number;
  public readonly evidence: string;
  public readonly concern: string;
  public readonly suggestion: string;
  public readonly confidence: number;

  constructor(props: CriterionFeedbackProps) {
    this.validate(props);
    this.criterion = props.criterion.trim();
    this.score = Math.round(props.score);
    this.evidence = props.evidence.trim();
    this.concern = props.concern.trim();
    this.suggestion = props.suggestion.trim();
    this.confidence = Number(props.confidence.toFixed(2));
  }

  private validate(props: CriterionFeedbackProps): void {
    const errors: string[] = [];

    if (!props.criterion || props.criterion.trim().length === 0) {
      errors.push('Criterion name must be specified');
    }

    if (typeof props.score !== 'number' || isNaN(props.score) || props.score < 1 || props.score > 10) {
      errors.push(`Score must be a number between 1 and 10, got: ${props.score}`);
    }

    if (!props.evidence || props.evidence.trim().length === 0) {
      errors.push('Evidence from submission must be cited');
    }

    if (!props.concern || props.concern.trim().length === 0) {
      errors.push('Identified concern must be specified');
    }

    if (!props.suggestion || props.suggestion.trim().length === 0) {
      errors.push('Actionable suggestion must be specified');
    }

    if (
      typeof props.confidence !== 'number' ||
      isNaN(props.confidence) ||
      props.confidence < 0 ||
      props.confidence > 1
    ) {
      errors.push(`Confidence must be between 0.0 and 1.0, got: ${props.confidence}`);
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }

  public get rating(): PerformanceRating {
    if (this.score >= 8) return 'EXEMPLARY';
    if (this.score >= 5) return 'COMPETENT';
    return 'NEEDS_WORK';
  }

  public toJSON(): Record<string, unknown> {
    return {
      criterion: this.criterion,
      score: this.score,
      rating: this.rating,
      evidence: this.evidence,
      concern: this.concern,
      suggestion: this.suggestion,
      confidence: this.confidence,
    };
  }
}
