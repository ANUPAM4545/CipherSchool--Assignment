import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../../src/infrastructure/db/schema';
import { seedProblems } from '../../src/infrastructure/db/seeds';
import { SqliteProblemRepository } from '../../src/infrastructure/repositories/SqliteProblemRepository';
import { SqliteSubmissionRepository } from '../../src/infrastructure/repositories/SqliteSubmissionRepository';
import { SqliteEvaluationRepository } from '../../src/infrastructure/repositories/SqliteEvaluationRepository';
import { SqliteAttemptRepository } from '../../src/infrastructure/repositories/SqliteAttemptRepository';
import { IEvaluator } from '../../src/domain/contracts/IEvaluator';
import { ISubmissionPayload } from '../../src/domain/contracts/ISubmissionPayload';
import { Problem } from '../../src/domain/entities/Problem';
import { Evaluation } from '../../src/domain/entities/Evaluation';
import { StructuredTextPayload } from '../../src/domain/payloads/StructuredTextPayload';
import { StartAttemptUseCase } from '../../src/application/use-cases/StartAttemptUseCase';
import { SubmitSolutionUseCase } from '../../src/application/use-cases/SubmitSolutionUseCase';
import { EvaluateAttemptUseCase } from '../../src/application/use-cases/EvaluateAttemptUseCase';
import { ValidationError, InvalidStateTransitionError } from '../../src/domain/exceptions/DomainExceptions';

/**
 * MOCK EVALUATORS TO SIMULATE SPECIFIC FAILURE CONDITIONS
 */

class TimeoutMockEvaluator implements IEvaluator {
  public readonly id = 'timeout-evaluator';
  public readonly name = 'Timeout Mock Evaluator';

  public async evaluate(): Promise<Evaluation> {
    throw new Error('ETIMEDOUT: Connection to AI evaluation service timed out after 15000ms');
  }
}

class MalformedResponseMockEvaluator implements IEvaluator {
  public readonly id = 'malformed-evaluator';
  public readonly name = 'Malformed Response Mock Evaluator';

  public async evaluate(): Promise<Evaluation> {
    // Simulates an unparseable response from LLM
    throw new Error('SyntaxError: Unexpected token < in JSON at position 0 (AI service returned 502 Bad Gateway HTML)');
  }
}

class AIFailureMockEvaluator implements IEvaluator {
  public readonly id = 'ai-failure-evaluator';
  public readonly name = 'AI Failure Mock Evaluator';

  public async evaluate(): Promise<Evaluation> {
    throw new Error('Gemini API Rate Limit Exceeded (HTTP 429: RESOURCE_EXHAUSTED)');
  }
}

describe('Failure Handling & Persistence Invariants Audit', () => {
  let db: Database.Database;
  let problemRepo: SqliteProblemRepository;
  let submissionRepo: SqliteSubmissionRepository;
  let evaluationRepo: SqliteEvaluationRepository;
  let attemptRepo: SqliteAttemptRepository;

  beforeEach(async () => {
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

  const validPayload = new StructuredTextPayload({
    requirementsUnderstanding: 'Parking lot for cars, bikes, trucks with pricing.',
    assumptionsAndConstraints: 'Single entry gate, multi-floor building, hourly tariff.',
    classesAndEntities: 'Vehicle, Car, Bike, Spot, Floor, ParkingLot, Ticket, Payment.',
    responsibilities: 'ParkingLot assigns nearest spot; Spot marks occupancy; Ticket tracks fees.',
    relationshipsAndInterfaces: 'IPricingStrategy implemented by HourlyTariff; Vehicle has Spot.',
    patternsAndTradeoffs: 'Used Strategy pattern for pricing to allow runtime tariff changes.',
    edgeCasesAndReasoning: 'Addressed concurrent entry race conditions with spot reservation locks.',
  });

  it('1. AI Timeout: Transitions attempt to FAILED while safely preserving the submission', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);
    const evaluateAttempt = new EvaluateAttemptUseCase(
      attemptRepo,
      problemRepo,
      new TimeoutMockEvaluator()
    );

    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'learner-fail-test',
    });

    await submitSolution.execute({ attemptId: attempt.id, payload: validPayload });

    // Attempt evaluation which times out
    const failedAttempt = await evaluateAttempt.execute(attempt.id);

    expect(failedAttempt.state).toBe('FAILED');
    expect(failedAttempt.failureReason).toContain('ETIMEDOUT');

    // CRITICAL: Verify the submission is completely intact in SQLite
    const inDb = await attemptRepo.findById(attempt.id);
    expect(inDb).not.toBeNull();
    expect(inDb?.state).toBe('FAILED');
    expect(inDb?.submission).toBeDefined();
    expect(inDb?.submission?.payload.format).toBe('STRUCTURED_TEXT');
    expect(inDb?.submission?.payload.toEvaluationContext()).toContain('Parking lot for cars, bikes, trucks');
  });

  it('2. AI Failure (Rate Limit): Transitions attempt to FAILED and keeps submission safe', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);
    const evaluateAttempt = new EvaluateAttemptUseCase(
      attemptRepo,
      problemRepo,
      new AIFailureMockEvaluator()
    );

    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'learner-rate-test',
    });

    await submitSolution.execute({ attemptId: attempt.id, payload: validPayload });
    const failedAttempt = await evaluateAttempt.execute(attempt.id);

    expect(failedAttempt.state).toBe('FAILED');
    expect(failedAttempt.failureReason).toContain('Rate Limit Exceeded');

    // Verify submission is safely preserved in DB
    const inDb = await attemptRepo.findById(attempt.id);
    expect(inDb?.submission).toBeDefined();
    expect(inDb?.submission?.contentHash).toBe(validPayload.calculateHash());
  });

  it('3. Malformed AI Response: Caught gracefully and marks attempt as FAILED', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);
    const evaluateAttempt = new EvaluateAttemptUseCase(
      attemptRepo,
      problemRepo,
      new MalformedResponseMockEvaluator()
    );

    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'learner-malformed-test',
    });

    await submitSolution.execute({ attemptId: attempt.id, payload: validPayload });
    const failedAttempt = await evaluateAttempt.execute(attempt.id);

    expect(failedAttempt.state).toBe('FAILED');
    expect(failedAttempt.failureReason).toContain('SyntaxError');
  });

  it('4. Invalid Submission: Fast-fails at validation stage before database commit or AI call', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);

    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'learner-invalid-test',
    });

    const emptyPayload = new StructuredTextPayload({
      requirementsUnderstanding: '',
      assumptionsAndConstraints: 'short',
      classesAndEntities: '',
      responsibilities: '',
      relationshipsAndInterfaces: '',
      patternsAndTradeoffs: '',
      edgeCasesAndReasoning: '',
    });

    await expect(
      submitSolution.execute({ attemptId: attempt.id, payload: emptyPayload })
    ).rejects.toThrow(ValidationError);

    // Verify attempt remains in DRAFT
    const inDb = await attemptRepo.findById(attempt.id);
    expect(inDb?.state).toBe('DRAFT');
    expect(inDb?.submission).toBeUndefined();
  });

  it('5. Duplicate Submission / Idempotency: Same content yields identical SHA-256 hash', async () => {
    const payload1 = new StructuredTextPayload({ ...validPayload.data });
    const payload2 = new StructuredTextPayload({ ...validPayload.data });

    expect(payload1.calculateHash()).toBe(payload2.calculateHash());
    expect(payload1.calculateHash().length).toBe(64); // Valid SHA-256
  });

  it('6. Invalid State Transition: Strictly rejected by domain state machine', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'learner-fsm-test',
    });

    // Cannot start evaluation on a DRAFT attempt without submission
    expect(() => attempt.startEvaluation()).toThrow(InvalidStateTransitionError);

    // Cannot complete an attempt that was never evaluating
    expect(() => attempt.completeEvaluation({ attemptId: attempt.id } as any)).toThrow(
      InvalidStateTransitionError
    );
  });
});
