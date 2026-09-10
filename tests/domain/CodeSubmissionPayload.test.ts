import { describe, it, expect } from 'vitest';
import { CodeSubmissionPayload } from '../../src/domain/payloads/CodeSubmissionPayload';
import { ExecutionResult } from '../../src/domain/entities/ExecutionResult';
import { Problem } from '../../src/domain/entities/Problem';

describe('CodeSubmissionPayload & Coding Domain Entities', () => {
  it('validates a correct JavaScript code payload', () => {
    const payload = new CodeSubmissionPayload({
      language: 'javascript',
      sourceCode: 'function twoSum(nums, target) { return [0, 1]; }',
      entryPoint: 'twoSum',
    });

    const validation = payload.validateStructure();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(payload.format).toBe('CODE');
  });

  it('validates a correct Python code payload', () => {
    const payload = new CodeSubmissionPayload({
      language: 'python',
      sourceCode: 'def twoSum(nums, target):\n    return [0, 1]',
      entryPoint: 'twoSum',
    });

    const validation = payload.validateStructure();
    expect(validation.isValid).toBe(true);
  });

  it('rejects an unsupported programming language', () => {
    const payload = new CodeSubmissionPayload({
      language: 'brainfuck' as any,
      sourceCode: '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',
    });

    const validation = payload.validateStructure();
    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain('unsupported programming language');
  });

  it('rejects an empty or too brief source code', () => {
    const payload = new CodeSubmissionPayload({
      language: 'javascript',
      sourceCode: '   short   ',
    });

    const validation = payload.validateStructure();
    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain('too short');
  });

  it('calculates deterministic SHA256 hash', () => {
    const payload1 = new CodeSubmissionPayload({
      language: 'javascript',
      sourceCode: 'function twoSum(nums, target) { return [0, 1]; }',
      entryPoint: 'twoSum',
    });

    const payload2 = new CodeSubmissionPayload({
      language: 'javascript',
      sourceCode: 'function twoSum(nums, target) { return [0, 1]; }',
      entryPoint: 'twoSum',
    });

    const payload3 = new CodeSubmissionPayload({
      language: 'python',
      sourceCode: 'def twoSum(nums, target): return [0, 1]',
      entryPoint: 'twoSum',
    });

    expect(payload1.calculateHash()).toBe(payload2.calculateHash());
    expect(payload1.calculateHash()).not.toBe(payload3.calculateHash());
  });

  it('formats evaluation context with language markdown code block', () => {
    const payload = new CodeSubmissionPayload({
      language: 'python',
      sourceCode: 'def solve(): pass',
      entryPoint: 'solve',
    });

    const context = payload.toEvaluationContext();
    expect(context).toContain('PYTHON');
    expect(context).toContain('`solve`');
    expect(context).toContain('```python');
    expect(context).toContain('def solve(): pass');
  });

  it('CRITICAL SECURITY: ExecutionResult.toSafeClientJSON() strips hidden test inputs and outputs', () => {
    const execResult = new ExecutionResult({
      status: 'COMPLETED',
      compileSuccess: true,
      runtimeSuccess: true,
      testsPassed: 2,
      testsFailed: 1,
      totalTests: 3,
      executionTimeMs: 45,
      stdout: 'Running test harness...\n',
      stderr: '',
      testCaseResults: [
        {
          testCaseId: 'vis-1',
          status: 'PASSED',
          input: '[2,7,11,15], target=9',
          expectedOutput: '[0,1]',
          actualOutput: '[0,1]',
          executionTimeMs: 12,
          isHidden: false,
        },
        {
          testCaseId: 'vis-2',
          status: 'PASSED',
          input: '[3,2,4], target=6',
          expectedOutput: '[1,2]',
          actualOutput: '[1,2]',
          executionTimeMs: 10,
          isHidden: false,
        },
        {
          testCaseId: 'hid-secret-3',
          status: 'FAILED',
          input: 'SECRET_LARGE_ARRAY_OF_10000_ELEMENTS',
          expectedOutput: 'SECRET_EXPECTED_INDEXES_9999_9998',
          actualOutput: '[-1,-1]',
          executionTimeMs: 23,
          error: 'Assertion failed',
          isHidden: true, // <--- HIDDEN TEST CASE
        },
      ],
    });

    const safeClientJson = execResult.toSafeClientJSON();

    // Verify visible tests retain details
    const visibleResult = (safeClientJson.testCaseResults as any[])[0];
    expect(visibleResult.input).toBe('[2,7,11,15], target=9');
    expect(visibleResult.expectedOutput).toBe('[0,1]');
    expect(visibleResult.isHidden).toBe(false);

    // Verify hidden test NEVER leaks secret input or expected output
    const hiddenResult = (safeClientJson.testCaseResults as any[])[2];
    expect(hiddenResult.isHidden).toBe(true);
    expect(hiddenResult.input).toBeUndefined();
    expect(hiddenResult.expectedOutput).toBeUndefined();
    expect(hiddenResult.actualOutput).toBeUndefined();
    expect(hiddenResult.testCaseId).not.toContain('secret');
    expect(hiddenResult.testCaseId).toBe('hidden-test-3');

    // Summary counts are accurately provided
    expect(safeClientJson.hiddenSummary).toEqual({ passed: 0, total: 1 });
    expect(safeClientJson.visibleSummary).toEqual({ passed: 2, total: 2 });
  });

  it('Problem.toClientJSON() strips hidden test cases from client response', () => {
    const problem = new Problem({
      id: 'prob-two-sum',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'EASY',
      type: 'CODING',
      shortDescription: 'Find two indices summing to target.',
      functionalRequirements: ['Return indices'],
      nonFunctionalRequirements: ['O(n) time'],
      constraints: ['2 <= nums.length <= 10^4'],
      conceptsPracticed: ['Hash Map', 'Two Pointers'],
      codingConfig: {
        entryPoint: 'twoSum',
        examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
        visibleTestCases: [
          { id: 'vis-1', input: '{"nums":[2,7,11,15],"target":9}', expectedOutput: '[0,1]', isHidden: false },
        ],
        hiddenTestCases: [
          { id: 'hid-secret-edge', input: '{"nums":[-1000,-2000],"target":-3000}', expectedOutput: '[0,1]', isHidden: true },
        ],
        starterCode: {
          javascript: 'function twoSum(nums, target) {\n\n}',
          python: 'def twoSum(nums, target):\n    pass',
        },
        allowedLanguages: ['javascript', 'python'],
      },
    });

    const clientJson = problem.toClientJSON();
    const config = clientJson.codingConfig as any;

    expect(config.visibleTestCases).toHaveLength(1);
    expect(config.visibleTestCases[0].input).toBe('{"nums":[2,7,11,15],"target":9}');
    // Hidden tests are completely absent from client response
    expect(config.hiddenTestCases).toBeUndefined();
    // Only safe aggregate count is provided
    expect(config.hiddenTestCasesCount).toBe(1);
  });
});
