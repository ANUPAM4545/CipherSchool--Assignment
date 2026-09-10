import { ICodeExecutionAdapter, TestCase, ExecutionOptions } from '../../domain/contracts/ICodeExecutionAdapter';
import { ProgrammingLanguage } from '../../domain/contracts/ProgrammingLanguage';
import { ExecutionResult, TestCaseResult, ExecutionStatus } from '../../domain/entities/ExecutionResult';
import { IsolatedExecutionEnvironment } from './IsolatedExecutionEnvironment';

export class JavaScriptExecutionAdapter implements ICodeExecutionAdapter {
  public readonly language: ProgrammingLanguage = 'javascript';
  public readonly displayName = 'JavaScript (Node.js)';

  public async execute(
    sourceCode: string,
    entryPoint: string,
    testCases: TestCase[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const timeoutMs = options.timeoutMs || 3000;

    // Test harness that executes the student's solution against each test case
    const harnessCode = `
const fs = require('fs');

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-6;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // Check if ordering matters; default to exact element-by-element match
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!keysB.includes(k) || !deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

// 1. Load student's code
let studentFunction;
try {
  ${sourceCode}
  if (typeof ${entryPoint} === 'function') {
    studentFunction = ${entryPoint};
  } else {
    throw new Error("Target function '${entryPoint}' was not defined in the submitted solution.");
  }
} catch (compileErr) {
  console.log('__LLD_RESULT_START__' + JSON.stringify({
    type: 'COMPILATION_ERROR',
    error: compileErr.stack || compileErr.message
  }) + '__LLD_RESULT_END__');
  process.exit(0);
}

// 2. Run test cases
const rawTestCases = ${JSON.stringify(testCases)};
const results = [];
let passedCount = 0;

for (const tc of rawTestCases) {
  let parsedInput;
  try {
    parsedInput = JSON.parse(tc.input);
  } catch {
    parsedInput = tc.input;
  }

  let expectedValue;
  try {
    expectedValue = JSON.parse(tc.expectedOutput);
  } catch {
    expectedValue = tc.expectedOutput;
  }

  const start = performance.now();
  try {
    let actualValue;
    if (typeof parsedInput === 'object' && parsedInput !== null && !Array.isArray(parsedInput)) {
      // Pass object values as individual arguments if input is an object map
      actualValue = studentFunction(...Object.values(parsedInput));
    } else if (Array.isArray(parsedInput)) {
      actualValue = studentFunction(...parsedInput);
    } else {
      actualValue = studentFunction(parsedInput);
    }

    const elapsed = Math.round(performance.now() - start);
    const isPass = deepEqual(actualValue, expectedValue);
    if (isPass) passedCount++;

    results.push({
      testCaseId: tc.id,
      status: isPass ? 'PASSED' : 'FAILED',
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: JSON.stringify(actualValue),
      executionTimeMs: elapsed,
      isHidden: tc.isHidden,
    });
  } catch (runErr) {
    const elapsed = Math.round(performance.now() - start);
    results.push({
      testCaseId: tc.id,
      status: 'FAILED',
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: undefined,
      executionTimeMs: elapsed,
      error: runErr.message || String(runErr),
      isHidden: tc.isHidden,
    });
  }
}

console.log('__LLD_RESULT_START__' + JSON.stringify({
  type: 'SUCCESS',
  results,
  passedCount,
  totalCount: rawTestCases.length
}) + '__LLD_RESULT_END__');
`;

    const executionOutput = await IsolatedExecutionEnvironment.execute('node', ['harness.js'], {
      timeoutMs,
      files: {
        'harness.js': harnessCode,
      },
    });

    if (executionOutput.timedOut) {
      return new ExecutionResult({
        status: 'TIME_LIMIT_EXCEEDED',
        compileSuccess: true,
        runtimeSuccess: false,
        testsPassed: 0,
        testsFailed: testCases.length,
        totalTests: testCases.length,
        executionTimeMs: executionOutput.executionTimeMs,
        stdout: executionOutput.stdout,
        stderr: 'Execution timed out: The code exceeded the maximum allowed execution time (3000ms). Check for infinite loops or non-terminating recursion.',
        testCaseResults: testCases.map((tc) => ({
          testCaseId: tc.id,
          status: 'FAILED',
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          executionTimeMs: timeoutMs,
          error: 'Time Limit Exceeded',
          isHidden: tc.isHidden,
        })),
        errorType: 'TIME_LIMIT_EXCEEDED',
      });
    }

    // Parse structured results output from stdout
    const startIdx = executionOutput.stdout.indexOf('__LLD_RESULT_START__');
    const endIdx = executionOutput.stdout.indexOf('__LLD_RESULT_END__');

    if (startIdx === -1 || endIdx === -1) {
      // Uncaught crash before harness output
      const isSyntaxErr = executionOutput.stderr.includes('SyntaxError');
      return new ExecutionResult({
        status: isSyntaxErr ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR',
        compileSuccess: !isSyntaxErr,
        runtimeSuccess: false,
        testsPassed: 0,
        testsFailed: testCases.length,
        totalTests: testCases.length,
        executionTimeMs: executionOutput.executionTimeMs,
        stdout: executionOutput.stdout,
        stderr: executionOutput.stderr || 'Runtime execution failed without output',
        testCaseResults: testCases.map((tc) => ({
          testCaseId: tc.id,
          status: 'FAILED',
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          executionTimeMs: 0,
          error: executionOutput.stderr.slice(0, 150) || 'Runtime crash',
          isHidden: tc.isHidden,
        })),
        errorType: isSyntaxErr ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR',
      });
    }

    const payloadJson = executionOutput.stdout.substring(
      startIdx + '__LLD_RESULT_START__'.length,
      endIdx
    );

    try {
      const parsed = JSON.parse(payloadJson);

      if (parsed.type === 'COMPILATION_ERROR') {
        return new ExecutionResult({
          status: 'COMPILATION_ERROR',
          compileSuccess: false,
          runtimeSuccess: false,
          testsPassed: 0,
          testsFailed: testCases.length,
          totalTests: testCases.length,
          executionTimeMs: executionOutput.executionTimeMs,
          stdout: executionOutput.stdout.replace(/__LLD_RESULT_START__.*?__LLD_RESULT_END__/s, '').trim(),
          stderr: parsed.error,
          testCaseResults: testCases.map((tc) => ({
            testCaseId: tc.id,
            status: 'FAILED',
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            executionTimeMs: 0,
            error: parsed.error.slice(0, 100),
            isHidden: tc.isHidden,
          })),
          errorType: 'COMPILATION_ERROR',
        });
      }

      const results: TestCaseResult[] = parsed.results;
      const testsPassed = parsed.passedCount;
      const testsFailed = parsed.totalCount - testsPassed;

      return new ExecutionResult({
        status: testsFailed === 0 ? 'COMPLETED' : 'COMPLETED',
        compileSuccess: true,
        runtimeSuccess: true,
        testsPassed,
        testsFailed,
        totalTests: parsed.totalCount,
        executionTimeMs: executionOutput.executionTimeMs,
        stdout: executionOutput.stdout.replace(/__LLD_RESULT_START__.*?__LLD_RESULT_END__/s, '').trim(),
        stderr: executionOutput.stderr,
        testCaseResults: results,
      });
    } catch (jsonErr) {
      return new ExecutionResult({
        status: 'FAILED',
        compileSuccess: false,
        runtimeSuccess: false,
        testsPassed: 0,
        testsFailed: testCases.length,
        totalTests: testCases.length,
        executionTimeMs: executionOutput.executionTimeMs,
        stdout: executionOutput.stdout,
        stderr: `Failed to parse test harness output: ${String(jsonErr)}`,
        testCaseResults: [],
        errorType: 'HARNESS_PARSE_ERROR',
      });
    }
  }
}
