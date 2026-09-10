import { describe, it, expect } from 'vitest';
import { Attempt } from '../../src/domain/entities/Attempt';
import { Submission } from '../../src/domain/entities/Submission';
import { Evaluation } from '../../src/domain/entities/Evaluation';
import { CriterionFeedback } from '../../src/domain/entities/CriterionFeedback';
import { StructuredTextPayload } from '../../src/domain/payloads/StructuredTextPayload';
import { ValidationError, DomainError } from '../../src/domain/exceptions/DomainExceptions';

describe('Attempt Aggregate Root', () => {
  const createValidPayload = () =>
    new StructuredTextPayload({
      requirementsUnderstanding: 'Design an extensible parking lot system with multiple levels.',
      assumptionsAndConstraints: 'Assuming uniform slot dimensions per vehicle type and single entry/exit.',
      classesAndEntities: 'ParkingLot, ParkingFloor, Spot, Vehicle, Ticket, Payment.',
      responsibilities: 'ParkingLot coordinates floors; Ticket manages timing and fee calculations.',
      relationshipsAndInterfaces: 'IPricingStrategy interface; ParkingLot has many ParkingFloors.',
      patternsAndTradeoffs: 'Used Strategy pattern for pricing calculations instead of hardcoded tariffs.',
      edgeCasesAndReasoning: 'Checked for concurrency race conditions on spot assignment.',
    });

  it('creates an attempt in DRAFT state with attemptNumber 1 by default', () => {
    const attempt = new Attempt({
      id: 'att-1',
      problemId: 'prob-1',
      learnerId: 'learner-1',
    });

    expect(attempt.id).toBe('att-1');
    expect(attempt.problemId).toBe('prob-1');
    expect(attempt.learnerId).toBe('learner-1');
    expect(attempt.state).toBe('DRAFT');
    expect(attempt.attemptNumber).toBe(1);
    expect(attempt.parentAttemptId).toBeUndefined();
    expect(attempt.submission).toBeUndefined();
    expect(attempt.evaluation).toBeUndefined();
  });

  it('submits a valid submission and transitions to SUBMITTED', () => {
    const attempt = new Attempt({
      id: 'att-1',
      problemId: 'prob-1',
      learnerId: 'learner-1',
    });

    const payload = createValidPayload();
    const submission = new Submission({
      id: 'sub-1',
      attemptId: 'att-1',
      payload,
    });

    attempt.submit(submission);

    expect(attempt.state).toBe('SUBMITTED');
    expect(attempt.submission).toBe(submission);
    expect(attempt.stateHistory[0].toState).toBe('SUBMITTED');
  });

  it('rejects submission with mismatched attemptId', () => {
    const attempt = new Attempt({
      id: 'att-1',
      problemId: 'prob-1',
      learnerId: 'learner-1',
    });

    const payload = createValidPayload();
    const submission = new Submission({
      id: 'sub-1',
      attemptId: 'att-DIFFERENT',
      payload,
    });

    expect(() => attempt.submit(submission)).toThrow(ValidationError);
  });

  it('progresses through evaluation lifecycle to COMPLETED', () => {
    const attempt = new Attempt({
      id: 'att-1',
      problemId: 'prob-1',
      learnerId: 'learner-1',
    });

    const submission = new Submission({
      id: 'sub-1',
      attemptId: 'att-1',
      payload: createValidPayload(),
    });

    attempt.submit(submission);
    expect(attempt.state).toBe('SUBMITTED');

    attempt.startEvaluation();
    expect(attempt.state).toBe('EVALUATING');

    const criterion = new CriterionFeedback({
      criterion: 'Class Responsibilities',
      score: 8,
      evidence: 'ParkingLot coordinates floors; Ticket manages timing',
      concern: 'Ticket also handles payment calculation directly',
      suggestion: 'Separate PaymentProcessor into its own service class',
      confidence: 0.9,
    });

    const evaluation = new Evaluation({
      id: 'eval-1',
      attemptId: 'att-1',
      evaluatorId: 'gemini-evaluator',
      summary: 'Solid domain model with clean separation of entities.',
      criteria: [criterion],
    });

    attempt.completeEvaluation(evaluation);
    expect(attempt.state).toBe('COMPLETED');
    expect(attempt.evaluation).toBe(evaluation);
    expect(attempt.evaluation?.totalScore).toBe(8);
  });

  it('handles evaluation failure and allows retry', () => {
    const attempt = new Attempt({
      id: 'att-1',
      problemId: 'prob-1',
      learnerId: 'learner-1',
    });

    attempt.submit(
      new Submission({
        id: 'sub-1',
        attemptId: 'att-1',
        payload: createValidPayload(),
      })
    );

    attempt.startEvaluation();
    attempt.failEvaluation('Gemini API timeout after 15000ms');

    expect(attempt.state).toBe('FAILED');
    expect(attempt.failureReason).toBe('Gemini API timeout after 15000ms');

    // Retry evaluation
    attempt.retryEvaluation();
    expect(attempt.state).toBe('EVALUATING');
    expect(attempt.failureReason).toBeUndefined();
  });

  it('creates a new retry attempt linked to the completed attempt (Attempt #1 -> Attempt #2)', () => {
    const attempt1 = new Attempt({
      id: 'att-1',
      problemId: 'prob-1',
      learnerId: 'learner-1',
    });

    attempt1.submit(
      new Submission({
        id: 'sub-1',
        attemptId: 'att-1',
        payload: createValidPayload(),
      })
    );
    attempt1.startEvaluation();

    const evaluation = new Evaluation({
      id: 'eval-1',
      attemptId: 'att-1',
      evaluatorId: 'gemini-evaluator',
      summary: 'Well structured.',
      criteria: [
        new CriterionFeedback({
          criterion: 'Extensibility',
          score: 7,
          evidence: 'IPricingStrategy interface',
          concern: 'Lacks support for tiered discounts',
          suggestion: 'Introduce CompositePricingStrategy',
          confidence: 0.85,
        }),
      ],
    });

    attempt1.completeEvaluation(evaluation);

    // Create Retry Attempt
    const attempt2 = attempt1.createRetryAttempt('att-2');

    expect(attempt2.id).toBe('att-2');
    expect(attempt2.problemId).toBe('prob-1');
    expect(attempt2.learnerId).toBe('learner-1');
    expect(attempt2.attemptNumber).toBe(2);
    expect(attempt2.parentAttemptId).toBe('att-1');
    expect(attempt2.state).toBe('DRAFT');
  });

  it('prevents retry on an attempt that is not COMPLETED or FAILED', () => {
    const draftAttempt = new Attempt({
      id: 'att-1',
      problemId: 'prob-1',
      learnerId: 'learner-1',
    });

    expect(() => draftAttempt.createRetryAttempt('att-2')).toThrow(DomainError);
  });
});
