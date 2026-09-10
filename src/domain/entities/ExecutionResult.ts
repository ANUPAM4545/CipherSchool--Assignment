export type ExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'FAILED';

export interface TestCaseResult {
  testCaseId: string;
  status: 'PASSED' | 'FAILED';
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  executionTimeMs: number;
  error?: string;
  isHidden: boolean;
}

export interface ExecutionResultProps {
  status: ExecutionStatus;
  compileSuccess: boolean;
  runtimeSuccess: boolean;
  testsPassed: number;
  testsFailed: number;
  totalTests: number;
  executionTimeMs: number;
  memoryUsageKb?: number;
  stdout: string;
  stderr: string;
  testCaseResults: TestCaseResult[];
  errorType?: string;
}

export class ExecutionResult {
  public readonly status: ExecutionStatus;
  public readonly compileSuccess: boolean;
  public readonly runtimeSuccess: boolean;
  public readonly testsPassed: number;
  public readonly testsFailed: number;
  public readonly totalTests: number;
  public readonly executionTimeMs: number;
  public readonly memoryUsageKb?: number;
  public readonly stdout: string;
  public readonly stderr: string;
  public readonly testCaseResults: ReadonlyArray<TestCaseResult>;
  public readonly errorType?: string;

  constructor(props: ExecutionResultProps) {
    this.status = props.status;
    this.compileSuccess = props.compileSuccess;
    this.runtimeSuccess = props.runtimeSuccess;
    this.testsPassed = props.testsPassed;
    this.testsFailed = props.testsFailed;
    this.totalTests = props.totalTests;
    this.executionTimeMs = Math.max(0, props.executionTimeMs);
    this.memoryUsageKb = props.memoryUsageKb;
    this.stdout = props.stdout || '';
    this.stderr = props.stderr || '';
    this.testCaseResults = [...props.testCaseResults];
    this.errorType = props.errorType;
  }

  public get allPassed(): boolean {
    return this.status === 'COMPLETED' && this.testsPassed === this.totalTests && this.totalTests > 0;
  }

  public get passPercentage(): number {
    if (this.totalTests === 0) return 0;
    return Number(((this.testsPassed / this.totalTests) * 100).toFixed(1));
  }

  /**
   * CRITICAL SECURITY METHOD:
   * Returns a sanitized JSON representation for client transport.
   * Strips all input and expectedOutput data from hidden test cases,
   * preserving only safe aggregate outcomes so test secrets NEVER reach the browser.
   */
  public toSafeClientJSON(): Record<string, unknown> {
    const sanitizedTestCases = this.testCaseResults.map((t, idx) => {
      if (t.isHidden) {
        return {
          testCaseId: `hidden-test-${idx + 1}`,
          status: t.status,
          executionTimeMs: t.executionTimeMs,
          isHidden: true,
          error: t.status === 'FAILED' ? (t.error ? 'Runtime exception occurred' : 'Assertion failed') : undefined,
          // Input and expectedOutput deliberately omitted for hidden test cases
        };
      }
      return {
        testCaseId: t.testCaseId,
        status: t.status,
        input: t.input,
        expectedOutput: t.expectedOutput,
        actualOutput: t.actualOutput,
        executionTimeMs: t.executionTimeMs,
        error: t.error,
        isHidden: false,
      };
    });

    const hiddenTotal = this.testCaseResults.filter((t) => t.isHidden).length;
    const hiddenPassed = this.testCaseResults.filter((t) => t.isHidden && t.status === 'PASSED').length;
    const visibleTotal = this.testCaseResults.filter((t) => !t.isHidden).length;
    const visiblePassed = this.testCaseResults.filter((t) => !t.isHidden && t.status === 'PASSED').length;

    return {
      status: this.status,
      allPassed: this.allPassed,
      compileSuccess: this.compileSuccess,
      runtimeSuccess: this.runtimeSuccess,
      testsPassed: this.testsPassed,
      testsFailed: this.testsFailed,
      totalTests: this.totalTests,
      visibleSummary: { passed: visiblePassed, total: visibleTotal },
      hiddenSummary: hiddenTotal > 0 ? { passed: hiddenPassed, total: hiddenTotal } : undefined,
      executionTimeMs: this.executionTimeMs,
      memoryUsageKb: this.memoryUsageKb,
      stdout: this.stdout,
      stderr: this.stderr,
      errorType: this.errorType,
      testCaseResults: sanitizedTestCases,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      status: this.status,
      allPassed: this.allPassed,
      compileSuccess: this.compileSuccess,
      runtimeSuccess: this.runtimeSuccess,
      testsPassed: this.testsPassed,
      testsFailed: this.testsFailed,
      totalTests: this.totalTests,
      executionTimeMs: this.executionTimeMs,
      memoryUsageKb: this.memoryUsageKb,
      stdout: this.stdout,
      stderr: this.stderr,
      errorType: this.errorType,
      testCaseResults: [...this.testCaseResults],
    };
  }

  public static fromJSON(raw: Record<string, unknown>): ExecutionResult {
    return new ExecutionResult({
      status: (raw.status as ExecutionStatus) || 'FAILED',
      compileSuccess: Boolean(raw.compileSuccess),
      runtimeSuccess: Boolean(raw.runtimeSuccess),
      testsPassed: Number(raw.testsPassed || 0),
      testsFailed: Number(raw.testsFailed || 0),
      totalTests: Number(raw.totalTests || 0),
      executionTimeMs: Number(raw.executionTimeMs || 0),
      memoryUsageKb: raw.memoryUsageKb ? Number(raw.memoryUsageKb) : undefined,
      stdout: String(raw.stdout || ''),
      stderr: String(raw.stderr || ''),
      errorType: raw.errorType ? String(raw.errorType) : undefined,
      testCaseResults: Array.isArray(raw.testCaseResults)
        ? (raw.testCaseResults as TestCaseResult[])
        : [],
    });
  }
}
