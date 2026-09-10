import { describe, it, expect } from 'vitest';
import { CodeExecutionService } from '../../src/infrastructure/execution/CodeExecutionService';
import { JavaScriptExecutionAdapter } from '../../src/infrastructure/execution/JavaScriptExecutionAdapter';
import { PythonExecutionAdapter } from '../../src/infrastructure/execution/PythonExecutionAdapter';
import { CodeSubmissionPayload } from '../../src/domain/payloads/CodeSubmissionPayload';
import { CodingProblemConfig } from '../../src/domain/entities/Problem';
import { ICodeExecutionAdapter, TestCase } from '../../src/domain/contracts/ICodeExecutionAdapter';
import { ExecutionResult } from '../../src/domain/entities/ExecutionResult';

describe('CodeExecutionService & Secure Execution Adapters (Infrastructure Layer)', () => {
  const jsAdapter = new JavaScriptExecutionAdapter();
  const pyAdapter = new PythonExecutionAdapter();
  const executionService = new CodeExecutionService([jsAdapter, pyAdapter]);

  const sampleCodingConfig: CodingProblemConfig = {
    entryPoint: 'twoSum',
    examples: [],
    visibleTestCases: [
      {
        id: 'tc-1',
        input: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }),
        expectedOutput: JSON.stringify([0, 1]),
        isHidden: false,
      },
      {
        id: 'tc-2',
        input: JSON.stringify({ nums: [3, 2, 4], target: 6 }),
        expectedOutput: JSON.stringify([1, 2]),
        isHidden: false,
      },
    ],
    hiddenTestCases: [
      {
        id: 'tc-3-hidden',
        input: JSON.stringify({ nums: [3, 3], target: 6 }),
        expectedOutput: JSON.stringify([0, 1]),
        isHidden: true,
      },
    ],
    starterCode: { javascript: '', python: '' },
    allowedLanguages: ['javascript', 'python'],
    timeLimitMs: 2500,
  };

  describe('JavaScript Execution', () => {
    it('executes correct JavaScript code and passes all visible and hidden tests', async () => {
      const correctJs = `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`;

      const payload = new CodeSubmissionPayload({
        language: 'javascript',
        sourceCode: correctJs,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig, { runVisibleOnly: false });

      expect(result.status).toBe('COMPLETED');
      expect(result.compileSuccess).toBe(true);
      expect(result.runtimeSuccess).toBe(true);
      expect(result.testsPassed).toBe(3);
      expect(result.testsFailed).toBe(0);
      expect(result.allPassed).toBe(true);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('reports failure when JavaScript solution produces incorrect output', async () => {
      const buggyJs = `
function twoSum(nums, target) {
  // Buggy: returns always [0, 0]
  return [0, 0];
}`;

      const payload = new CodeSubmissionPayload({
        language: 'javascript',
        sourceCode: buggyJs,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig, { runVisibleOnly: true });

      expect(result.status).toBe('COMPLETED');
      expect(result.testsPassed).toBe(0);
      expect(result.testsFailed).toBe(2);
      expect(result.allPassed).toBe(false);
      expect(result.testCaseResults[0].actualOutput).toBe('[0,0]');
      expect(result.testCaseResults[0].status).toBe('FAILED');
    });

    it('handles JavaScript syntax and compilation errors without crashing', async () => {
      const invalidSyntaxJs = `
function twoSum(nums, target) {
  return [0, 1 // Missing closing bracket and syntax error
`;

      const payload = new CodeSubmissionPayload({
        language: 'javascript',
        sourceCode: invalidSyntaxJs,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig);

      expect(result.status).toBe('COMPILATION_ERROR');
      expect(result.compileSuccess).toBe(false);
      expect(result.testsPassed).toBe(0);
      expect(result.stderr).toContain('SyntaxError');
    });

    it('aborts runaway infinite loops with TIME_LIMIT_EXCEEDED', async () => {
      const infiniteLoopJs = `
function twoSum(nums, target) {
  while (true) {
    // Non-terminating loop
  }
}`;

      const fastTimeoutConfig: CodingProblemConfig = {
        ...sampleCodingConfig,
        timeLimitMs: 600, // Fast timeout for unit testing
      };

      const payload = new CodeSubmissionPayload({
        language: 'javascript',
        sourceCode: infiniteLoopJs,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, fastTimeoutConfig);

      expect(result.status).toBe('TIME_LIMIT_EXCEEDED');
      expect(result.errorType).toBe('TIME_LIMIT_EXCEEDED');
      expect(result.testsPassed).toBe(0);
      expect(result.stderr).toContain('timed out');
    }, 10000);
  });

  describe('Python Execution', () => {
    it('executes correct Python code and passes all test cases', async () => {
      const correctPy = `
def twoSum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []
`;

      const payload = new CodeSubmissionPayload({
        language: 'python',
        sourceCode: correctPy,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig, { runVisibleOnly: false });

      expect(result.status).toBe('COMPLETED');
      expect(result.testsPassed).toBe(3);
      expect(result.testsFailed).toBe(0);
      expect(result.allPassed).toBe(true);
    });

    it('reports failure when Python solution returns wrong answer', async () => {
      const buggyPy = `
def twoSum(nums, target):
    return [99, 99]
`;

      const payload = new CodeSubmissionPayload({
        language: 'python',
        sourceCode: buggyPy,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig, { runVisibleOnly: true });

      expect(result.testsPassed).toBe(0);
      expect(result.testsFailed).toBe(2);
      expect(result.testCaseResults[0].actualOutput).toBe('[99, 99]');
    });

    it('handles Python runtime errors cleanly', async () => {
      const runtimeErrorPy = `
def twoSum(nums, target):
    x = 1 / 0  # ZeroDivisionError
    return [0, 1]
`;

      const payload = new CodeSubmissionPayload({
        language: 'python',
        sourceCode: runtimeErrorPy,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig);

      expect(result.testsPassed).toBe(0);
      expect(result.testCaseResults[0].error).toContain('division by zero');
    });
  });

  describe('Security & Isolation Bounds', () => {
    it('CRITICAL: Learner code CANNOT access application secrets (GEMINI_API_KEY)', async () => {
      // Intentionally set a secret in host process.env
      process.env.GEMINI_API_KEY = 'super-secret-api-key-12345';

      const exploitCode = `
function twoSum(nums, target) {
  // Attacker attempts to read host environment secret
  const leaked = process.env.GEMINI_API_KEY || 'NOT_FOUND';
  if (leaked !== 'NOT_FOUND') {
    throw new Error('LEAKED_KEY: ' + leaked);
  }
  return [0, 1];
}`;

      const payload = new CodeSubmissionPayload({
        language: 'javascript',
        sourceCode: exploitCode,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig);

      // The key must NOT be leaked; the execution sandbox strips it!
      expect(result.stderr).not.toContain('super-secret-api-key-12345');
      expect(result.stderr).not.toContain('LEAKED_KEY');
      expect(result.status).toBe('COMPLETED');
    });

    it('CRITICAL: Learner code cannot access project SQLite database or local source files', async () => {
      const exploitCode = `
const fs = require('fs');
function twoSum(nums, target) {
  // Attacker attempts to read cipherschools.db from current working dir
  if (fs.existsSync('./data/lld_platform.sqlite') || fs.existsSync('./package.json')) {
    throw new Error('SECURITY_BREACH: Host files accessible!');
  }
  return [0, 1];
}`;

      const payload = new CodeSubmissionPayload({
        language: 'javascript',
        sourceCode: exploitCode,
        entryPoint: 'twoSum',
      });

      const result = await executionService.execute(payload, sampleCodingConfig);

      // Verify that cwd is an isolated ephemeral directory with no host project files
      expect(result.stderr).not.toContain('SECURITY_BREACH');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('Open-Closed Extensibility for New Languages', () => {
    it('allows registering a new language adapter without altering CodeExecutionService', async () => {
      class MockGoExecutionAdapter implements ICodeExecutionAdapter {
        public readonly language = 'go' as any;
        public readonly displayName = 'Go (Golang)';

        public async execute(): Promise<ExecutionResult> {
          return new ExecutionResult({
            status: 'COMPLETED',
            compileSuccess: true,
            runtimeSuccess: true,
            testsPassed: 1,
            testsFailed: 0,
            totalTests: 1,
            executionTimeMs: 15,
            stdout: 'Go binary compiled and executed.\n',
            stderr: '',
            testCaseResults: [
              {
                testCaseId: 'go-1',
                status: 'PASSED',
                executionTimeMs: 15,
                isHidden: false,
              },
            ],
          });
        }
      }

      const extendedService = new CodeExecutionService([jsAdapter, pyAdapter]);
      extendedService.registerAdapter(new MockGoExecutionAdapter());

      expect(extendedService.getSupportedLanguages()).toContain('go');

      const payload = new CodeSubmissionPayload({
        language: 'go' as any,
        sourceCode: 'package main\nfunc twoSum() {}',
        entryPoint: 'twoSum',
      });

      const result = await extendedService.execute(payload, sampleCodingConfig);
      expect(result.status).toBe('COMPLETED');
      expect(result.testsPassed).toBe(1);
    });
  });
});
