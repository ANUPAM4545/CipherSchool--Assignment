import { ICodeExecutionAdapter, TestCase, ExecutionOptions } from '../../domain/contracts/ICodeExecutionAdapter';
import { ProgrammingLanguage } from '../../domain/contracts/ProgrammingLanguage';
import { ExecutionResult, TestCaseResult } from '../../domain/entities/ExecutionResult';
import { IsolatedExecutionEnvironment } from './IsolatedExecutionEnvironment';

export class PythonExecutionAdapter implements ICodeExecutionAdapter {
  public readonly language: ProgrammingLanguage = 'python';
  public readonly displayName = 'Python (Python 3)';

  public async execute(
    sourceCode: string,
    entryPoint: string,
    testCases: TestCase[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const timeoutMs = options.timeoutMs || 3000;

    const harnessPython = `
import sys
import json
import time
import traceback

def deep_equal(a, b):
    if a == b:
        return True
    if isinstance(a, float) and isinstance(b, float):
        return abs(a - b) < 1e-6
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return False
        return all(deep_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(deep_equal(a[k], b[k]) for k in a)
    return str(a) == str(b)

# 1. Execute student's code in global namespace
namespace = {}
try:
    with open('solution.py', 'r', encoding='utf-8') as f:
        code = f.read()
    compiled = compile(code, 'solution.py', 'exec')
    exec(compiled, namespace)
    
    if '${entryPoint}' not in namespace or not callable(namespace['${entryPoint}']):
        raise AttributeError("Target function '${entryPoint}' was not defined in solution.")
    student_func = namespace['${entryPoint}']
except Exception as compile_err:
    sys.stdout.write('__LLD_RESULT_START__' + json.dumps({
        'type': 'COMPILATION_ERROR',
        'error': traceback.format_exc()
    }) + '__LLD_RESULT_END__\\n')
    sys.exit(0)

# 2. Run test cases
with open('testcases.json', 'r', encoding='utf-8') as f:
    raw_testcases = json.load(f)

results = []
passed_count = 0

for tc in raw_testcases:
    try:
        parsed_input = json.loads(tc['input'])
    except Exception:
        parsed_input = tc['input']

    try:
        expected_val = json.loads(tc['expectedOutput'])
    except Exception:
        expected_val = tc['expectedOutput']

    start = time.perf_counter()
    try:
        if isinstance(parsed_input, dict):
            actual_val = student_func(**parsed_input)
        elif isinstance(parsed_input, list):
            actual_val = student_func(*parsed_input)
        else:
            actual_val = student_func(parsed_input)

        elapsed_ms = round((time.perf_counter() - start) * 1000)
        is_pass = deep_equal(actual_val, expected_val)
        if is_pass:
            passed_count += 1

        results.append({
            'testCaseId': tc['id'],
            'status': 'PASSED' if is_pass else 'FAILED',
            'input': tc['input'],
            'expectedOutput': tc['expectedOutput'],
            'actualOutput': json.dumps(actual_val),
            'executionTimeMs': elapsed_ms,
            'isHidden': tc.get('isHidden', False)
        })
    except Exception as run_err:
        elapsed_ms = round((time.perf_counter() - start) * 1000)
        results.append({
            'testCaseId': tc['id'],
            'status': 'FAILED',
            'input': tc['input'],
            'expectedOutput': tc['expectedOutput'],
            'actualOutput': None,
            'executionTimeMs': elapsed_ms,
            'error': str(run_err),
            'isHidden': tc.get('isHidden', False)
        })

sys.stdout.write('__LLD_RESULT_START__' + json.dumps({
    'type': 'SUCCESS',
    'results': results,
    'passedCount': passed_count,
    'totalCount': len(raw_testcases)
}) + '__LLD_RESULT_END__\\n')
`;

    const executionOutput = await IsolatedExecutionEnvironment.execute('python3', ['harness.py'], {
      timeoutMs,
      files: {
        'solution.py': sourceCode,
        'harness.py': harnessPython,
        'testcases.json': JSON.stringify(testCases),
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

    const startIdx = executionOutput.stdout.indexOf('__LLD_RESULT_START__');
    const endIdx = executionOutput.stdout.indexOf('__LLD_RESULT_END__');

    if (startIdx === -1 || endIdx === -1) {
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
        stderr: executionOutput.stderr || 'Runtime error during Python execution',
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
        stderr: `Failed to parse Python test harness output: ${String(jsonErr)}`,
        testCaseResults: [],
        errorType: 'HARNESS_PARSE_ERROR',
      });
    }
  }
}
