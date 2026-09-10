import { IEvaluator } from '../../domain/contracts/IEvaluator';
import { IDeterministicValidator } from '../../domain/contracts/IDeterministicValidator';
import { ISubmissionPayload } from '../../domain/contracts/ISubmissionPayload';
import { Problem } from '../../domain/entities/Problem';
import { Evaluation } from '../../domain/entities/Evaluation';
import { CriterionFeedback } from '../../domain/entities/CriterionFeedback';
import { ValidationError } from '../../domain/exceptions/DomainExceptions';
import { CodeSubmissionPayload } from '../../domain/payloads/CodeSubmissionPayload';
import { CodeExecutionService } from '../execution/CodeExecutionService';
import { CodingAIEvaluator } from './CodingAIEvaluator';

export class CompositeEvaluator implements IEvaluator {
  public readonly id = 'composite-evaluator';
  public readonly name = 'Deterministic Validator + Cognitive Evaluator Pipeline';

  constructor(
    private readonly validator: IDeterministicValidator,
    private readonly lldEvaluator: IEvaluator,
    private readonly codeExecutionService?: CodeExecutionService,
    private readonly codingEvaluator?: CodingAIEvaluator
  ) {}

  public async evaluate(
    submission: ISubmissionPayload,
    problem: Problem,
    attemptId: string
  ): Promise<Evaluation> {
    // ==========================================
    // CODING PRACTICE PIPELINE
    // ==========================================
    if (problem.isCoding || submission instanceof CodeSubmissionPayload) {
      if (!problem.codingConfig) {
        throw new ValidationError([
          `Problem '${problem.title}' is marked as CODING but lacks coding configuration.`,
        ]);
      }

      if (!(submission instanceof CodeSubmissionPayload)) {
        throw new ValidationError(['Submission payload must be a CodeSubmissionPayload for coding problems.']);
      }

      // 1. Validate payload structure
      const structValidation = submission.validateStructure();
      if (!structValidation.isValid) {
        throw new ValidationError(structValidation.errors);
      }

      if (!this.codeExecutionService) {
        throw new Error('Code execution service is not configured in evaluation container.');
      }

      // 2. Stage 1: Deterministic Code Execution (Authoritative ground truth)
      const executionResult = await this.codeExecutionService.execute(
        submission,
        problem.codingConfig,
        { runVisibleOnly: false }
      );

      // 3. Stage 2: AI Cognitive Analysis (grounded in code + deterministic results)
      if (this.codingEvaluator) {
        try {
          return await this.codingEvaluator.evaluate(
            submission,
            problem,
            executionResult,
            attemptId
          );
        } catch (aiErr) {
          // Refinement Requirement 9: If Gemini fails after execution succeeds:
          // Keep ExecutionResult and show: "Code execution completed, but AI feedback is temporarily unavailable."
          // Do NOT replace the deterministic result.
          console.warn(
            `[CodingEvaluator] AI reasoning failed, returning deterministic execution result: ${
              aiErr instanceof Error ? aiErr.message : String(aiErr)
            }`
          );

          const fallbackCriteria = [
            new CriterionFeedback({
              criterion: 'Algorithmic Correctness & Logic',
              score: Math.max(1, Math.round((executionResult.testsPassed / Math.max(1, executionResult.totalTests)) * 10)),
              evidence: `Deterministic execution completed with status: ${executionResult.status}`,
              concern: executionResult.testsFailed > 0 ? `${executionResult.testsFailed} test case(s) failed` : 'None',
              suggestion: executionResult.testsFailed > 0 ? 'Review edge cases and failed assertions' : 'Code passes all test suites',
              confidence: 1.0,
            }),
          ];

          return new Evaluation({
            id: `eval-exec-${attemptId}-${Date.now()}`,
            attemptId,
            evaluatorId: this.id,
            summary: `Deterministic execution completed (${executionResult.testsPassed}/${executionResult.totalTests} tests passed in ${executionResult.executionTimeMs}ms). AI feedback is temporarily unavailable.`,
            criteria: fallbackCriteria,
          });
        }
      }

      // Pure deterministic fallback when no AI evaluator is wired
      const criteria = [
        new CriterionFeedback({
          criterion: 'Algorithmic Correctness & Logic',
          score: Math.max(1, Math.round((executionResult.testsPassed / Math.max(1, executionResult.totalTests)) * 10)),
          evidence: `Deterministic test run: ${executionResult.testsPassed} / ${executionResult.totalTests} passed`,
          concern: executionResult.testsFailed > 0 ? `${executionResult.testsFailed} tests failed` : 'None',
          suggestion: 'Check test case assertions',
          confidence: 1.0,
        }),
      ];

      return new Evaluation({
        id: `eval-exec-${attemptId}-${Date.now()}`,
        attemptId,
        evaluatorId: this.id,
        summary: `Deterministic code execution completed (${executionResult.testsPassed}/${executionResult.totalTests} passed).`,
        criteria,
      });
    }

    // ==========================================
    // LLD PRACTICE PIPELINE (EXISTING UNCHANGED)
    // ==========================================
    // Stage 1: Fast deterministic pre-validation
    const validationResult = this.validator.validate(submission, problem);
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors);
    }

    // Stage 2: Deep cognitive LLD evaluation
    return await this.lldEvaluator.evaluate(submission, problem, attemptId);
  }
}
