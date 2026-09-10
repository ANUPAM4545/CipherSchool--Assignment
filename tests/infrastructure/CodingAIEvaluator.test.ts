import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodingAIEvaluator } from '../../src/infrastructure/evaluators/CodingAIEvaluator';
import { CompositeEvaluator } from '../../src/infrastructure/evaluators/CompositeEvaluator';
import { DeterministicValidator } from '../../src/infrastructure/evaluators/DeterministicValidator';
import { CodeExecutionService } from '../../src/infrastructure/execution/CodeExecutionService';
import { JavaScriptExecutionAdapter } from '../../src/infrastructure/execution/JavaScriptExecutionAdapter';
import { PythonExecutionAdapter } from '../../src/infrastructure/execution/PythonExecutionAdapter';
import { CodeSubmissionPayload } from '../../src/domain/payloads/CodeSubmissionPayload';
import { Problem } from '../../src/domain/entities/Problem';
import { ExecutionResult } from '../../src/domain/entities/ExecutionResult';
import { MockEvaluator } from '../mocks/MockEvaluator';

describe('CodingAIEvaluator & Composite Coding Pipeline (Infrastructure Layer)', () => {
  const sampleCodingProblem = new Problem({
    id: 'prob-two-sum',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'EASY',
    type: 'CODING',
    shortDescription: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    functionalRequirements: ['Return zero-indexed array of two distinct indices'],
    nonFunctionalRequirements: ['Optimal O(n) time complexity'],
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Exactly one valid answer exists'],
    conceptsPracticed: ['Hash Map', 'Array', 'Two Pointers'],
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
      timeLimitMs: 2500,
    },
  });

  const validJsPayload = new CodeSubmissionPayload({
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

  const sampleExecutionResult = new ExecutionResult({
    status: 'COMPLETED',
    compileSuccess: true,
    runtimeSuccess: true,
    testsPassed: 2,
    testsFailed: 0,
    totalTests: 2,
    executionTimeMs: 42,
    stdout: 'All assertions passed\n',
    stderr: '',
    testCaseResults: [
      {
        testCaseId: 'vis-1',
        status: 'PASSED',
        input: '{"nums":[2,7,11,15],"target":9}',
        expectedOutput: '[0,1]',
        actualOutput: '[0,1]',
        executionTimeMs: 20,
        isHidden: false,
      },
      {
        testCaseId: 'hid-secret-1',
        status: 'PASSED',
        input: '{"nums":[3,3],"target":6}',
        expectedOutput: '[0,1]',
        actualOutput: '[0,1]',
        executionTimeMs: 22,
        isHidden: true,
      },
    ],
  });

  describe('Prompt Construction & Authoritative Results Injection', () => {
    it('injects learner source code, problem details, and deterministic execution results into prompt', () => {
      const evaluator = new CodingAIEvaluator('valid-test-key');
      const prompt = evaluator.buildPrompt(validJsPayload, sampleCodingProblem, sampleExecutionResult);

      // Must receive candidate source code
      expect(prompt).toContain('twoSum');
      expect(prompt).toContain('const complement = target - nums[i];');
      expect(prompt).toContain('JAVASCRIPT');

      // Must receive problem specs and constraints
      expect(prompt).toContain('Two Sum');
      expect(prompt).toContain('2 <= nums.length <= 10^4');

      // Must receive deterministic execution ground truth
      expect(prompt).toContain('AUTHORITATIVE DETERMINISTIC TEST EXECUTION RESULTS (SOURCE OF TRUTH)');
      expect(prompt).toContain('Tests Passed: 2 / 2 (100%)');
      expect(prompt).toContain('Total Execution Time: 42 ms');
      expect(prompt).toContain('DO NOT override or hallucinate test results');

      // Must enforce 6 rubric dimensions
      expect(prompt).toContain('1. Algorithmic Correctness & Logic');
      expect(prompt).toContain('2. Time Complexity');
      expect(prompt).toContain('3. Space Complexity');
      expect(prompt).toContain('4. Code Quality & Clean Architecture');
      expect(prompt).toContain('5. Idiomatic Language Usage');
      expect(prompt).toContain('6. Optimization & Alternative Approaches');
    });
  });

  describe('Evaluation Execution & Parsing', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
      delete process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
      process.env = originalEnv;
      vi.restoreAllMocks();
    });

    it('parses structured Gemini coding response and derives criteria scores + Big-O reasoning', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Optimal one-pass hash map solution with linear time complexity.',
                    estimatedTimeComplexity: 'O(n)',
                    timeComplexityReasoning: 'Single traversal through nums with O(1) hash map operations.',
                    estimatedSpaceComplexity: 'O(n)',
                    spaceComplexityReasoning: 'Map stores at most n elements in the worst case.',
                    criteria: [
                      {
                        criterion: 'Algorithmic Correctness & Logic',
                        score: 10,
                        evidence: 'map.set(nums[i], i); complement checking is correct',
                        concern: 'None',
                        suggestion: 'Consider validating input array bounds if untrusted',
                        confidence: 0.98,
                      },
                      {
                        criterion: 'Time Complexity',
                        score: 10,
                        evidence: 'for (let i = 0; i < nums.length; i++)',
                        concern: 'None',
                        suggestion: 'Optimal linear time achieved',
                        confidence: 0.95,
                      },
                      {
                        criterion: 'Space Complexity',
                        score: 9,
                        evidence: 'const map = new Map();',
                        concern: 'Auxiliary memory allocated proportional to input size',
                        suggestion: 'Acceptable trade-off for O(n) time',
                        confidence: 0.93,
                      },
                      {
                        criterion: 'Code Quality & Clean Architecture',
                        score: 9,
                        evidence: 'Clear variable names: complement, map',
                        concern: 'None',
                        suggestion: 'Well structured and readable',
                        confidence: 0.92,
                      },
                      {
                        criterion: 'Idiomatic Language Usage',
                        score: 9,
                        evidence: 'Used modern JavaScript Map over plain object',
                        concern: 'None',
                        suggestion: 'Effective idiomatic JS',
                        confidence: 0.94,
                      },
                      {
                        criterion: 'Optimization & Alternative Approaches',
                        score: 8,
                        evidence: 'One-pass hash map',
                        concern: 'If array was sorted, two pointers would allow O(1) space',
                        suggestion: 'Mention two-pointer approach trade-offs',
                        confidence: 0.9,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeminiResponse,
      } as Response);

      const evaluator = new CodingAIEvaluator('valid-test-key');
      const evaluation = await evaluator.evaluate(
        validJsPayload,
        sampleCodingProblem,
        sampleExecutionResult,
        'att-coding-1'
      );

      expect(evaluation).toBeDefined();
      expect(evaluation.criteria).toHaveLength(6);
      expect(evaluation.totalScore).toBe(55);
      expect(evaluation.maxTotalScore).toBe(60);
      expect(evaluation.summary).toContain('**Deterministic Execution Outcome**: 2 / 2 tests passed');
      expect(evaluation.summary).toContain('**AI-Analyzed Time Complexity**: `O(n)`');
      expect(evaluation.summary).toContain('**AI-Analyzed Space Complexity**: `O(n)`');
    });

    it('strictly fails when GEMINI_API_KEY is missing (never silently returns mock)', async () => {
      const evaluator = new CodingAIEvaluator('');
      await expect(
        evaluator.evaluate(validJsPayload, sampleCodingProblem, sampleExecutionResult, 'att-no-key')
      ).rejects.toThrow(/Gemini API key is not configured/);
    });

    it('rejects malformed or incomplete Gemini response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{"summary":"incomplete", "criteria":[]}' }],
              },
            },
          ],
        }),
      } as Response);

      const evaluator = new CodingAIEvaluator('valid-test-key');
      await expect(
        evaluator.evaluate(validJsPayload, sampleCodingProblem, sampleExecutionResult, 'att-bad-resp')
      ).rejects.toThrow(/Gemini coding response must contain exactly 6 rubric criteria/);
    });
  });

  describe('CompositeEvaluator Fallback & Graceful Degradation', () => {
    it('preserves ExecutionResult and reports AI temporarily unavailable when Gemini fails (Requirement 9)', async () => {
      const jsAdapter = new JavaScriptExecutionAdapter();
      const execService = new CodeExecutionService([jsAdapter]);
      const failingAiEvaluator = new CodingAIEvaluator('invalid-key-will-fail');

      // Mock fetch to simulate Gemini API 503 error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Gemini overload',
      } as Response);

      const compositeEvaluator = new CompositeEvaluator(
        new DeterministicValidator(),
        new MockEvaluator(),
        execService,
        failingAiEvaluator
      );

      const evaluation = await compositeEvaluator.evaluate(
        validJsPayload,
        sampleCodingProblem,
        'att-gemini-fail'
      );

      // Deterministic results MUST be preserved!
      expect(evaluation).toBeDefined();
      expect(evaluation.summary).toContain('Deterministic execution completed');
      expect(evaluation.summary).toContain('AI feedback is temporarily unavailable');
      expect(evaluation.criteria[0].criterion).toBe('Algorithmic Correctness & Logic');
      expect(evaluation.criteria[0].evidence).toContain('Deterministic execution completed with status: COMPLETED');
    });
  });
});
