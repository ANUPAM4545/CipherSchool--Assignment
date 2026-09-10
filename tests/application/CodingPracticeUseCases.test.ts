import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../../src/infrastructure/db/schema';
import { SqliteProblemRepository } from '../../src/infrastructure/repositories/SqliteProblemRepository';
import { SqliteAttemptRepository } from '../../src/infrastructure/repositories/SqliteAttemptRepository';
import { SqliteSubmissionRepository } from '../../src/infrastructure/repositories/SqliteSubmissionRepository';
import { SqliteEvaluationRepository } from '../../src/infrastructure/repositories/SqliteEvaluationRepository';
import { StartAttemptUseCase } from '../../src/application/use-cases/StartAttemptUseCase';
import { SubmitSolutionUseCase } from '../../src/application/use-cases/SubmitSolutionUseCase';
import { EvaluateAttemptUseCase } from '../../src/application/use-cases/EvaluateAttemptUseCase';
import { RetryAttemptUseCase } from '../../src/application/use-cases/RetryAttemptUseCase';
import { GetAttemptHistoryUseCase } from '../../src/application/use-cases/GetAttemptHistoryUseCase';
import { CompositeEvaluator } from '../../src/infrastructure/evaluators/CompositeEvaluator';
import { DeterministicValidator } from '../../src/infrastructure/evaluators/DeterministicValidator';
import { CodeExecutionService } from '../../src/infrastructure/execution/CodeExecutionService';
import { JavaScriptExecutionAdapter } from '../../src/infrastructure/execution/JavaScriptExecutionAdapter';
import { PythonExecutionAdapter } from '../../src/infrastructure/execution/PythonExecutionAdapter';
import { Problem } from '../../src/domain/entities/Problem';
import { CodeSubmissionPayload } from '../../src/domain/payloads/CodeSubmissionPayload';
import { MockEvaluator } from '../mocks/MockEvaluator';

describe('Coding Practice Application Flow & Use Cases (Integration)', () => {
  let db: Database.Database;
  let problemRepo: SqliteProblemRepository;
  let attemptRepo: SqliteAttemptRepository;
  let submissionRepo: SqliteSubmissionRepository;
  let evaluationRepo: SqliteEvaluationRepository;
  let executionService: CodeExecutionService;
  let compositeEvaluator: CompositeEvaluator;

  const sampleCodingProblem = new Problem({
    id: 'prob-two-sum-integration',
    title: 'Two Sum Integration',
    slug: 'two-sum-integration',
    difficulty: 'EASY',
    type: 'CODING',
    shortDescription: 'Find two indices summing to target.',
    functionalRequirements: ['Return indices'],
    nonFunctionalRequirements: ['O(n) time'],
    constraints: ['2 <= nums.length <= 10^4'],
    conceptsPracticed: ['Hash Map'],
    codingConfig: {
      entryPoint: 'twoSum',
      examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
      visibleTestCases: [
        {
          id: 'vis-1',
          input: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }),
          expectedOutput: JSON.stringify([0, 1]),
          isHidden: false,
        },
      ],
      hiddenTestCases: [
        {
          id: 'hid-secret-1',
          input: JSON.stringify({ nums: [3, 3], target: 6 }),
          expectedOutput: JSON.stringify([0, 1]),
          isHidden: true,
        },
      ],
      starterCode: {
        javascript: 'function twoSum(nums, target) {}',
        python: 'def twoSum(nums, target): pass',
      },
      allowedLanguages: ['javascript', 'python'],
      timeLimitMs: 3000,
    },
  });

  beforeEach(async () => {
    db = new Database(':memory:');
    initializeSchema(db);

    problemRepo = new SqliteProblemRepository(db);
    submissionRepo = new SqliteSubmissionRepository(db);
    evaluationRepo = new SqliteEvaluationRepository(db);
    attemptRepo = new SqliteAttemptRepository(db, submissionRepo, evaluationRepo);

    await problemRepo.save(sampleCodingProblem);

    const jsAdapter = new JavaScriptExecutionAdapter();
    const pyAdapter = new PythonExecutionAdapter();
    executionService = new CodeExecutionService([jsAdapter, pyAdapter]);

    compositeEvaluator = new CompositeEvaluator(
      new DeterministicValidator(),
      new MockEvaluator(),
      executionService
    );
  });

  it('runs complete coding attempt lifecycle: Start -> Run -> Submit -> Evaluate -> History -> Retry', async () => {
    const startUseCase = new StartAttemptUseCase(problemRepo, attemptRepo);
    const submitUseCase = new SubmitSolutionUseCase(attemptRepo);
    const evaluateUseCase = new EvaluateAttemptUseCase(attemptRepo, problemRepo, compositeEvaluator);
    const historyUseCase = new GetAttemptHistoryUseCase(attemptRepo);
    const retryUseCase = new RetryAttemptUseCase(attemptRepo);

    // 1. Start Attempt
    const attempt = await startUseCase.execute({
      problemId: sampleCodingProblem.id,
      learnerId: 'learner-test-1',
    });

    expect(attempt.id).toBeDefined();
    expect(attempt.state).toBe('DRAFT');
    expect(attempt.attemptNumber).toBe(1);

    // 2. Deterministic "Run Code" on Visible Tests (Fast feedback)
    const codePayload = new CodeSubmissionPayload({
      language: 'javascript',
      sourceCode: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      entryPoint: 'twoSum',
    });

    const runResult = await executionService.execute(
      codePayload,
      sampleCodingProblem.codingConfig!,
      { runVisibleOnly: true }
    );

    expect(runResult.status).toBe('COMPLETED');
    expect(runResult.testsPassed).toBe(1); // Only 1 visible test executed
    expect(runResult.totalTests).toBe(1);

    // 3. Submit Solution (Persist submission)
    const submittedAttempt = await submitUseCase.execute({
      attemptId: attempt.id,
      payload: codePayload,
    });

    expect(submittedAttempt.state).toBe('SUBMITTED');
    expect(submittedAttempt.submission).toBeDefined();

    // 4. Evaluate Attempt (Runs visible + hidden tests)
    const evaluatedAttempt = await evaluateUseCase.execute(attempt.id);

    expect(evaluatedAttempt.state).toBe('COMPLETED');
    expect(evaluatedAttempt.evaluation).toBeDefined();
    expect(evaluatedAttempt.evaluation?.summary).toContain('Deterministic code execution completed (2/2 passed)');

    // 5. Check Attempt History
    const history = await historyUseCase.execute(sampleCodingProblem.id, 'learner-test-1');
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(attempt.id);
    expect(history[0].state).toBe('COMPLETED');

    // 6. Retry Attempt
    const retryAttempt = await retryUseCase.execute(attempt.id);
    expect(retryAttempt.state).toBe('DRAFT');
    expect(retryAttempt.attemptNumber).toBe(2);
    expect(retryAttempt.parentAttemptId).toBe(attempt.id);
    // Prefills code from previous submission
    expect((retryAttempt.prefilledPayload as any)?.sourceCode).toContain('function twoSum');

    // Verify history now shows 2 attempts
    const updatedHistory = await historyUseCase.execute(sampleCodingProblem.id, 'learner-test-1');
    expect(updatedHistory).toHaveLength(2);
  });
});
