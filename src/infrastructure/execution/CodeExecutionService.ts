import { ICodeExecutionAdapter, TestCase } from '../../domain/contracts/ICodeExecutionAdapter';
import { ProgrammingLanguage } from '../../domain/contracts/ProgrammingLanguage';
import { CodeSubmissionPayload } from '../../domain/payloads/CodeSubmissionPayload';
import { CodingProblemConfig } from '../../domain/entities/Problem';
import { ExecutionResult } from '../../domain/entities/ExecutionResult';

export class CodeExecutionService {
  private readonly adapters = new Map<ProgrammingLanguage, ICodeExecutionAdapter>();

  constructor(adapters: ICodeExecutionAdapter[] = []) {
    for (const adapter of adapters) {
      this.registerAdapter(adapter);
    }
  }

  public registerAdapter(adapter: ICodeExecutionAdapter): void {
    this.adapters.set(adapter.language, adapter);
  }

  public getSupportedLanguages(): ProgrammingLanguage[] {
    return Array.from(this.adapters.keys());
  }

  public async execute(
    payload: CodeSubmissionPayload,
    codingConfig: CodingProblemConfig,
    options: { runVisibleOnly?: boolean } = {}
  ): Promise<ExecutionResult> {
    const adapter = this.adapters.get(payload.data.language);

    if (!adapter) {
      return new ExecutionResult({
        status: 'COMPILATION_ERROR',
        compileSuccess: false,
        runtimeSuccess: false,
        testsPassed: 0,
        testsFailed: 1,
        totalTests: 1,
        executionTimeMs: 0,
        stdout: '',
        stderr: `Unsupported programming language runtime: '${payload.data.language}'. Supported languages: ${this.getSupportedLanguages().join(', ')}`,
        testCaseResults: [],
        errorType: 'UNSUPPORTED_LANGUAGE',
      });
    }

    const testCases: TestCase[] = options.runVisibleOnly
      ? codingConfig.visibleTestCases.map((tc) => ({ ...tc, isHidden: false }))
      : [
          ...codingConfig.visibleTestCases.map((tc) => ({ ...tc, isHidden: false })),
          ...codingConfig.hiddenTestCases.map((tc) => ({ ...tc, isHidden: true })),
        ];

    const entryPoint = payload.data.entryPoint || codingConfig.entryPoint;

    return await adapter.execute(payload.data.sourceCode, entryPoint, testCases, {
      timeoutMs: codingConfig.timeLimitMs || 3000,
      memoryLimitMb: codingConfig.memoryLimitMb || 128,
    });
  }
}
