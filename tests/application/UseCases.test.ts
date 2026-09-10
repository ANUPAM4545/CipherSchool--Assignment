import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../../src/infrastructure/db/schema';
import { seedProblems } from '../../src/infrastructure/db/seeds';
import { SqliteProblemRepository } from '../../src/infrastructure/repositories/SqliteProblemRepository';
import { SqliteSubmissionRepository } from '../../src/infrastructure/repositories/SqliteSubmissionRepository';
import { SqliteEvaluationRepository } from '../../src/infrastructure/repositories/SqliteEvaluationRepository';
import { SqliteAttemptRepository } from '../../src/infrastructure/repositories/SqliteAttemptRepository';
import { DeterministicValidator } from '../../src/infrastructure/evaluators/DeterministicValidator';
import { MockEvaluator } from '../mocks/MockEvaluator';
import { CompositeEvaluator } from '../../src/infrastructure/evaluators/CompositeEvaluator';
import { GetProblemsUseCase, GetProblemUseCase } from '../../src/application/use-cases/GetProblemsUseCase';
import { StartAttemptUseCase } from '../../src/application/use-cases/StartAttemptUseCase';
import { SubmitSolutionUseCase } from '../../src/application/use-cases/SubmitSolutionUseCase';
import { EvaluateAttemptUseCase } from '../../src/application/use-cases/EvaluateAttemptUseCase';
import { GetAttemptHistoryUseCase } from '../../src/application/use-cases/GetAttemptHistoryUseCase';
import { RetryAttemptUseCase } from '../../src/application/use-cases/RetryAttemptUseCase';
import { StructuredTextPayload } from '../../src/domain/payloads/StructuredTextPayload';
import { ValidationError } from '../../src/domain/exceptions/DomainExceptions';

describe('Application Layer Use Cases', () => {
  let db: Database.Database;
  let problemRepo: SqliteProblemRepository;
  let submissionRepo: SqliteSubmissionRepository;
  let evaluationRepo: SqliteEvaluationRepository;
  let attemptRepo: SqliteAttemptRepository;
  let evaluator: CompositeEvaluator;

  beforeEach(async () => {
    db = new Database(':memory:');
    initializeSchema(db);

    problemRepo = new SqliteProblemRepository(db);
    submissionRepo = new SqliteSubmissionRepository(db);
    evaluationRepo = new SqliteEvaluationRepository(db);
    attemptRepo = new SqliteAttemptRepository(db, submissionRepo, evaluationRepo);

    await seedProblems(problemRepo);

    const validator = new DeterministicValidator();
    const aiEvaluator = new MockEvaluator();
    evaluator = new CompositeEvaluator(validator, aiEvaluator);
  });

  afterEach(() => {
    db.close();
  });

  const validPayload = new StructuredTextPayload({
    requirementsUnderstanding: 'Design an automated parking lot accommodating cars, bikes, and trucks.',
    assumptionsAndConstraints: 'Single entry gate, multi-floor building, hourly tariff.',
    classesAndEntities: 'Vehicle, Car, Bike, Spot, Floor, ParkingLot, Ticket, Payment.',
    responsibilities: 'ParkingLot assigns nearest spot; Spot marks occupancy; Ticket tracks fees.',
    relationshipsAndInterfaces: 'IPricingStrategy implemented by HourlyTariff; Vehicle has Spot.',
    patternsAndTradeoffs: 'Used Strategy pattern for pricing to allow runtime tariff changes.',
    edgeCasesAndReasoning: 'Addressed concurrent entry race conditions with spot reservation locks.',
  });

  it('GetProblemsUseCase and GetProblemUseCase retrieve catalog correctly', async () => {
    const getProblems = new GetProblemsUseCase(problemRepo);
    const getProblem = new GetProblemUseCase(problemRepo);

    const problems = await getProblems.execute();
    expect(problems.length).toBeGreaterThanOrEqual(7);
    expect(problems.filter((p) => p.isLLD)).toHaveLength(5);
    expect(problems.filter((p) => p.isCoding).length).toBeGreaterThanOrEqual(2);

    const parkingLot = await getProblem.execute('parking-lot-system');
    expect(parkingLot.title).toBe('Parking Lot System');
  });

  it('StartAttemptUseCase creates a new attempt in DRAFT state', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'user-bob',
    });

    expect(attempt.id).toBeDefined();
    expect(attempt.state).toBe('DRAFT');
    expect(attempt.attemptNumber).toBe(1);
  });

  it('SubmitSolutionUseCase persists submission and sets state to SUBMITTED', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);

    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'user-bob',
    });

    const submittedAttempt = await submitSolution.execute({
      attemptId: attempt.id,
      payload: validPayload,
    });

    expect(submittedAttempt.state).toBe('SUBMITTED');
    expect(submittedAttempt.submission).toBeDefined();

    // Verify it is saved in SQLite
    const inDb = await attemptRepo.findById(attempt.id);
    expect(inDb?.state).toBe('SUBMITTED');
    expect(inDb?.submission?.payload.format).toBe('STRUCTURED_TEXT');
  });

  it('SubmitSolutionUseCase rejects invalid payloads with ValidationError', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);

    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'user-bob',
    });

    const badPayload = new StructuredTextPayload({
      requirementsUnderstanding: 'Short',
      assumptionsAndConstraints: '',
      classesAndEntities: '',
      responsibilities: '',
      relationshipsAndInterfaces: '',
      patternsAndTradeoffs: '',
      edgeCasesAndReasoning: '',
    });

    await expect(
      submitSolution.execute({
        attemptId: attempt.id,
        payload: badPayload,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('EvaluateAttemptUseCase runs evaluation pipeline to COMPLETED state', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);
    const evaluateAttempt = new EvaluateAttemptUseCase(attemptRepo, problemRepo, evaluator);

    const attempt = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'user-bob',
    });

    await submitSolution.execute({
      attemptId: attempt.id,
      payload: validPayload,
    });

    const completed = await evaluateAttempt.execute(attempt.id);
    expect(completed.state).toBe('COMPLETED');
    expect(completed.evaluation).toBeDefined();
    expect(completed.evaluation?.criteria).toHaveLength(8);
  });

  it('RetryAttemptUseCase creates Attempt #2 with parent reference', async () => {
    const startAttempt = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitSolution = new SubmitSolutionUseCase(attemptRepo);
    const evaluateAttempt = new EvaluateAttemptUseCase(attemptRepo, problemRepo, evaluator);
    const retryAttempt = new RetryAttemptUseCase(attemptRepo);
    const getHistory = new GetAttemptHistoryUseCase(attemptRepo);

    // Attempt #1
    const attempt1 = await startAttempt.execute({
      problemId: 'prob-parking-lot',
      learnerId: 'user-charlie',
    });

    await submitSolution.execute({
      attemptId: attempt1.id,
      payload: validPayload,
    });

    await evaluateAttempt.execute(attempt1.id);

    // Retry
    const attempt2 = await retryAttempt.execute(attempt1.id);
    expect(attempt2.attemptNumber).toBe(2);
    expect(attempt2.parentAttemptId).toBe(attempt1.id);
    expect(attempt2.state).toBe('DRAFT');

    const history = await getHistory.execute('prob-parking-lot', 'user-charlie');
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe(attempt1.id);
    expect(history[1].id).toBe(attempt2.id);
  });
});
