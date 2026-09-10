import { ProgrammingLanguage } from './ProgrammingLanguage';
import { ExecutionResult } from '../entities/ExecutionResult';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
  isHidden: boolean;
}

export interface ExecutionOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface ICodeExecutionAdapter {
  readonly language: ProgrammingLanguage;
  readonly displayName: string;
  execute(
    sourceCode: string,
    entryPoint: string,
    testCases: TestCase[],
    options?: ExecutionOptions
  ): Promise<ExecutionResult>;
}
