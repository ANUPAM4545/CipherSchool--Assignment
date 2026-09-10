import { IEvaluator } from '../../src/domain/contracts/IEvaluator';
import { ISubmissionPayload } from '../../src/domain/contracts/ISubmissionPayload';
import { Problem } from '../../src/domain/entities/Problem';
import { Evaluation } from '../../src/domain/entities/Evaluation';
import { CriterionFeedback } from '../../src/domain/entities/CriterionFeedback';

/**
 * Isolated Test Mock Evaluator
 * 
 * STRICTLY FOR UNIT TESTING.
 * This mock MUST NOT be imported or referenced by any production source code.
 */
export class MockEvaluator implements IEvaluator {
  public readonly id = 'test-mock-evaluator';
  public readonly name = 'Isolated Test Mock Evaluator';

  constructor(
    private readonly options?: {
      shouldFail?: boolean;
      failureMessage?: string;
      customScores?: number[];
    }
  ) {}

  public async evaluate(
    _submission: ISubmissionPayload,
    problem: Problem,
    attemptId: string
  ): Promise<Evaluation> {
    if (this.options?.shouldFail) {
      throw new Error(this.options.failureMessage || 'Mock evaluation deliberate test failure');
    }

    const scores = this.options?.customScores || [8, 8, 8, 7, 8, 8, 8, 8];
    const rubricDimensions = [
      'Requirement Understanding',
      'Class Responsibilities',
      'Coupling & Cohesion',
      'Encapsulation & Interfaces',
      'Abstraction & Pattern Fitness',
      'Extensibility',
      'Edge Cases & Testability',
      'Quality of Explanation',
    ];

    const criteria = rubricDimensions.map((dimension, i) => {
      const score = scores[i] ?? 8;
      return new CriterionFeedback({
        criterion: dimension,
        score,
        evidence: `[TEST FIXTURE] Mock evidence for ${dimension} on problem ${problem.title}`,
        concern: `[TEST FIXTURE] Mock concern for ${dimension}`,
        suggestion: `[TEST FIXTURE] Mock suggestion for ${dimension}`,
        confidence: 0.9,
      });
    });

    return new Evaluation({
      id: `eval-mock-${attemptId}-${Date.now()}`,
      attemptId,
      evaluatorId: this.id,
      summary: `[TEST FIXTURE] Mock architectural evaluation for "${problem.title}".`,
      criteria,
    });
  }
}
