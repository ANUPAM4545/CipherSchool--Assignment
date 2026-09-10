import { describe, it, expect } from 'vitest';
import { IEvaluator } from '../../src/domain/contracts/IEvaluator';
import { ISubmissionPayload } from '../../src/domain/contracts/ISubmissionPayload';
import { Problem } from '../../src/domain/entities/Problem';
import { Evaluation } from '../../src/domain/entities/Evaluation';
import { CriterionFeedback } from '../../src/domain/entities/CriterionFeedback';
import { Attempt } from '../../src/domain/entities/Attempt';
import { Submission } from '../../src/domain/entities/Submission';
import { StructuredTextPayload } from '../../src/domain/payloads/StructuredTextPayload';

/**
 * CHANGE TEST B:
 * Verifies that new evaluator implementations (Rule-Based AST and Human Reviewer)
 * can be introduced cleanly by implementing IEvaluator WITHOUT
 * altering the practice orchestration flow or Attempt state machine.
 */

class RuleBasedASTEvaluator implements IEvaluator {
  public readonly id = 'rule-based-ast-evaluator';
  public readonly name = 'Static AST Rule Evaluator';

  public async evaluate(
    submission: ISubmissionPayload,
    problem: Problem,
    attemptId: string
  ): Promise<Evaluation> {
    const context = submission.toEvaluationContext();

    // Deterministic rule checks
    const hasInterfaces = context.includes('interface');
    const hasStrategy = context.includes('Strategy');

    const criteria = [
      new CriterionFeedback({
        criterion: 'Encapsulation & Interfaces',
        score: hasInterfaces ? 9 : 5,
        evidence: hasInterfaces
          ? 'Rule detected: Interface keyword present in domain model.'
          : 'Rule violation: No interface definitions detected.',
        concern: hasInterfaces ? 'None' : 'Missing abstractions',
        suggestion: 'Introduce interface contracts for service classes.',
        confidence: 1.0,
      }),
      new CriterionFeedback({
        criterion: 'Abstraction & Pattern Fitness',
        score: hasStrategy ? 9 : 6,
        evidence: hasStrategy
          ? 'Rule detected: Strategy pattern implemented.'
          : 'Rule violation: Missing design pattern implementations.',
        concern: hasStrategy ? 'None' : 'Consider using Strategy pattern.',
        suggestion: 'Apply Strategy pattern for extensible algorithms.',
        confidence: 1.0,
      }),
    ];

    return new Evaluation({
      id: `eval-ast-${Date.now()}`,
      attemptId,
      evaluatorId: this.id,
      summary: 'Automated rule-based static analysis completed.',
      criteria,
    });
  }
}

class MockHumanReviewerEvaluator implements IEvaluator {
  public readonly id = 'human-mentor-evaluator';
  public readonly name = 'Senior Staff Mentor Reviewer';

  constructor(
    private readonly mentorNotes: string,
    private readonly mentorScore: number
  ) {}

  public async evaluate(
    submission: ISubmissionPayload,
    problem: Problem,
    attemptId: string
  ): Promise<Evaluation> {
    const criteria = [
      new CriterionFeedback({
        criterion: 'Class Responsibilities',
        score: this.mentorScore,
        evidence: 'Reviewed class breakdown during 1-on-1 mentor session.',
        concern: 'Slight responsibility bleed between Floor and Spot.',
        suggestion: this.mentorNotes,
        confidence: 1.0,
      }),
    ];

    return new Evaluation({
      id: `eval-human-${Date.now()}`,
      attemptId,
      evaluatorId: this.id,
      summary: `Manual review conducted by Staff Architect. Feedback: ${this.mentorNotes}`,
      criteria,
    });
  }
}

describe('Change Test B: Evaluator Extensibility', () => {
  const sampleProblem = new Problem({
    id: 'prob-eval-test',
    title: 'Vending Machine',
    slug: 'vending-machine',
    difficulty: 'EASY',
    shortDescription: 'Design a vending machine',
    functionalRequirements: ['Accept money', 'Dispense item'],
    nonFunctionalRequirements: ['State pattern'],
    constraints: ['Single user'],
    conceptsPracticed: ['State Pattern'],
  });

  const payload = new StructuredTextPayload({
    requirementsUnderstanding: 'Vending machine state management and change return.',
    assumptionsAndConstraints: 'Assuming cash-only for MVP and in-memory product catalog.',
    classesAndEntities: 'VendingMachine, State, IdleState, HasMoneyState, DispensingState, Item.',
    responsibilities: 'VendingMachine delegates actions to current State object.',
    relationshipsAndInterfaces: 'IState interface implemented by concrete state classes.',
    patternsAndTradeoffs: 'State pattern eliminates sprawling switch-case statements.',
    edgeCasesAndReasoning: 'Insufficient change handled by rolling back transaction.',
  });

  it('runs RuleBasedASTEvaluator through the practice flow without modifying Attempt lifecycle', async () => {
    const attempt = new Attempt({
      id: 'att-ast-1',
      problemId: sampleProblem.id,
      learnerId: 'learner-ast',
    });

    attempt.submit(new Submission({ id: 'sub-ast-1', attemptId: attempt.id, payload }));
    attempt.startEvaluation();

    const astEvaluator = new RuleBasedASTEvaluator();
    const evaluation = await astEvaluator.evaluate(payload, sampleProblem, attempt.id);

    attempt.completeEvaluation(evaluation);
    expect(attempt.state).toBe('COMPLETED');
    expect(attempt.evaluation?.evaluatorId).toBe('rule-based-ast-evaluator');
    expect(attempt.evaluation?.criteria).toHaveLength(2);
  });

  it('runs MockHumanReviewerEvaluator through the practice flow without modifying Attempt lifecycle', async () => {
    const attempt = new Attempt({
      id: 'att-human-1',
      problemId: sampleProblem.id,
      learnerId: 'learner-human',
    });

    attempt.submit(new Submission({ id: 'sub-human-1', attemptId: attempt.id, payload }));
    attempt.startEvaluation();

    const humanEvaluator = new MockHumanReviewerEvaluator(
      'Clean state transitions. Great usage of the State pattern.',
      9
    );
    const evaluation = await humanEvaluator.evaluate(payload, sampleProblem, attempt.id);

    attempt.completeEvaluation(evaluation);
    expect(attempt.state).toBe('COMPLETED');
    expect(attempt.evaluation?.evaluatorId).toBe('human-mentor-evaluator');
    expect(attempt.evaluation?.totalScore).toBe(9);
  });
});
