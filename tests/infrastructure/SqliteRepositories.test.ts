import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../../src/infrastructure/db/schema';
import { seedProblems } from '../../src/infrastructure/db/seeds';
import { SqliteProblemRepository } from '../../src/infrastructure/repositories/SqliteProblemRepository';
import { SqliteSubmissionRepository } from '../../src/infrastructure/repositories/SqliteSubmissionRepository';
import { SqliteEvaluationRepository } from '../../src/infrastructure/repositories/SqliteEvaluationRepository';
import { SqliteAttemptRepository } from '../../src/infrastructure/repositories/SqliteAttemptRepository';
import { Attempt } from '../../src/domain/entities/Attempt';
import { Submission } from '../../src/domain/entities/Submission';
import { Evaluation } from '../../src/domain/entities/Evaluation';
import { CriterionFeedback } from '../../src/domain/entities/CriterionFeedback';
import { StructuredTextPayload } from '../../src/domain/payloads/StructuredTextPayload';

describe('SQLite Repositories (Infrastructure Layer)', () => {
  let db: Database.Database;
  let problemRepo: SqliteProblemRepository;
  let submissionRepo: SqliteSubmissionRepository;
  let evaluationRepo: SqliteEvaluationRepository;
  let attemptRepo: SqliteAttemptRepository;

  beforeEach(async () => {
    // Use in-memory SQLite for isolated test runs
    db = new Database(':memory:');
    initializeSchema(db);

    problemRepo = new SqliteProblemRepository(db);
    submissionRepo = new SqliteSubmissionRepository(db);
    evaluationRepo = new SqliteEvaluationRepository(db);
    attemptRepo = new SqliteAttemptRepository(db, submissionRepo, evaluationRepo);

    await seedProblems(problemRepo);
  });

  afterEach(() => {
    db.close();
  });

  it('seeds and retrieves curated LLD and Coding problems', async () => {
    const allProblems = await problemRepo.findAll();
    const lldProblems = allProblems.filter((p) => p.isLLD);
    const codingProblems = allProblems.filter((p) => p.isCoding);
    expect(lldProblems).toHaveLength(5);
    expect(codingProblems.length).toBeGreaterThanOrEqual(2);

    const parkingLot = await problemRepo.findBySlug('parking-lot-system');
    expect(parkingLot).not.toBeNull();
    expect(parkingLot?.title).toBe('Parking Lot System');
    expect(parkingLot?.difficulty).toBe('MEDIUM');
    expect(parkingLot?.functionalRequirements.length).toBeGreaterThan(3);
    expect(parkingLot?.rubricDimensions.length).toBe(8);

    const vendingMachine = await problemRepo.findById('prob-vending-machine');
    expect(vendingMachine).not.toBeNull();
    expect(vendingMachine?.slug).toBe('vending-machine');
  });

  it('persists and rehydrates an Attempt with Submission and Evaluation', async () => {
    const attempt = new Attempt({
      id: 'test-att-1',
      problemId: 'prob-parking-lot',
      learnerId: 'test-learner',
      attemptNumber: 1,
    });

    const payload = new StructuredTextPayload({
      requirementsUnderstanding: 'Managing spots for cars, bikes, trucks with pricing.',
      assumptionsAndConstraints: 'Assuming in-memory tracking and single entry/exit gates.',
      classesAndEntities: 'ParkingLot, Floor, Spot, Vehicle, Ticket, Payment.',
      responsibilities: 'ParkingLot manages overall lot; Spot tracks vacancy.',
      relationshipsAndInterfaces: 'IPricingStrategy implemented by HourlyPricing.',
      patternsAndTradeoffs: 'Strategy pattern for extensible pricing algorithms.',
      edgeCasesAndReasoning: 'Spot reservation concurrency handled via mutex locks.',
    });

    const submission = new Submission({
      id: 'test-sub-1',
      attemptId: 'test-att-1',
      payload,
    });

    attempt.submit(submission);
    await attemptRepo.save(attempt);

    // Verify retrieval
    const retrieved = await attemptRepo.findById('test-att-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.state).toBe('SUBMITTED');
    expect(retrieved?.submission).toBeDefined();
    expect(retrieved?.submission?.id).toBe('test-sub-1');
    expect(retrieved?.submission?.payload.format).toBe('STRUCTURED_TEXT');

    // Progress to evaluation
    retrieved!.startEvaluation();

    const evaluation = new Evaluation({
      id: 'test-eval-1',
      attemptId: 'test-att-1',
      evaluatorId: 'gemini-evaluator',
      summary: 'Solid domain design.',
      criteria: [
        new CriterionFeedback({
          criterion: 'Class Responsibilities',
          score: 8,
          evidence: 'Spot tracks vacancy; ParkingLot manages lot',
          concern: 'Ticket class has minor coupling with payment',
          suggestion: 'Extract PaymentService',
          confidence: 0.92,
        }),
      ],
    });

    retrieved!.completeEvaluation(evaluation);
    await attemptRepo.save(retrieved!);

    // Rehydrate completed attempt
    const completed = await attemptRepo.findById('test-att-1');
    expect(completed?.state).toBe('COMPLETED');
    expect(completed?.evaluation).toBeDefined();
    expect(completed?.evaluation?.totalScore).toBe(8);
    expect(completed?.evaluation?.criteria).toHaveLength(1);
    expect(completed?.evaluation?.criteria[0].evidence).toBe('Spot tracks vacancy; ParkingLot manages lot');
  });

  it('maintains attempt history and retry lineage across iterations', async () => {
    // Attempt #1
    const attempt1 = new Attempt({
      id: 'att-hist-1',
      problemId: 'prob-parking-lot',
      learnerId: 'learner-alice',
      attemptNumber: 1,
    });
    attempt1.submit(
      new Submission({
        id: 'sub-hist-1',
        attemptId: 'att-hist-1',
        payload: new StructuredTextPayload({
          requirementsUnderstanding: 'Valid requirements text over twenty characters.',
          assumptionsAndConstraints: 'Valid assumptions text over twenty characters.',
          classesAndEntities: 'Valid classes and entities text over twenty characters.',
          responsibilities: 'Valid responsibilities text over twenty characters.',
          relationshipsAndInterfaces: 'Valid relationships text over twenty characters.',
          patternsAndTradeoffs: 'Valid patterns and trade-offs text over twenty characters.',
          edgeCasesAndReasoning: 'Valid edge cases reasoning text over twenty characters.',
        }),
      })
    );
    attempt1.startEvaluation();
    attempt1.completeEvaluation(
      new Evaluation({
        id: 'eval-hist-1',
        attemptId: 'att-hist-1',
        evaluatorId: 'gemini',
        summary: 'Initial attempt',
        criteria: [
          new CriterionFeedback({
            criterion: 'Requirement Understanding',
            score: 6,
            evidence: 'Basic requirements mentioned',
            concern: 'Missed dynamic pricing',
            suggestion: 'Add pricing strategy',
            confidence: 0.9,
          }),
        ],
      })
    );
    await attemptRepo.save(attempt1);

    // Attempt #2 (Retry of Attempt #1)
    const attempt2 = attempt1.createRetryAttempt('att-hist-2');
    await attemptRepo.save(attempt2);

    const history = await attemptRepo.findByProblemAndLearner('prob-parking-lot', 'learner-alice');
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('att-hist-1');
    expect(history[0].attemptNumber).toBe(1);
    expect(history[1].id).toBe('att-hist-2');
    expect(history[1].attemptNumber).toBe(2);
    expect(history[1].parentAttemptId).toBe('att-hist-1');
    expect(history[1].state).toBe('DRAFT');
  });
});
