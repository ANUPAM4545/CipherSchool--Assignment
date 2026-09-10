import { SubmissionPayload, ValidationResult } from '../contracts/ISubmissionPayload';
import { ProgrammingLanguage, isSupportedLanguage } from '../contracts/ProgrammingLanguage';
import { createHash } from 'crypto';

export interface CodeSubmissionData {
  language: ProgrammingLanguage;
  sourceCode: string;
  entryPoint?: string;
  customInput?: string;
}

export class CodeSubmissionPayload extends SubmissionPayload {
  public static readonly FORMAT = 'CODE';
  readonly format = CodeSubmissionPayload.FORMAT;

  private static readonly MIN_CODE_LENGTH = 10;

  constructor(public readonly data: CodeSubmissionData) {
    super();
  }

  public validateStructure(): ValidationResult {
    const errors: string[] = [];

    if (!this.data.language || !isSupportedLanguage(this.data.language)) {
      errors.push(
        `Invalid or unsupported programming language: '${this.data.language}'. Supported languages: JavaScript, Python.`
      );
    }

    const trimmedCode = (this.data.sourceCode || '').trim();
    if (trimmedCode.length === 0) {
      errors.push('Source code cannot be empty');
    } else if (trimmedCode.length < CodeSubmissionPayload.MIN_CODE_LENGTH) {
      errors.push(
        `Source code is too short (minimum ${CodeSubmissionPayload.MIN_CODE_LENGTH} characters required, provided ${trimmedCode.length})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public toEvaluationContext(): string {
    return [
      `### Programming Language: ${this.data.language.toUpperCase()}`,
      this.data.entryPoint ? `### Target Entry Point / Function: \`${this.data.entryPoint}\`` : '',
      ``,
      `### Learner's Submitted Source Code:`,
      `\`\`\`${this.data.language}`,
      this.data.sourceCode.trim(),
      `\`\`\``,
    ]
      .filter(Boolean)
      .join('\n');
  }

  public calculateHash(): string {
    const rawContent = JSON.stringify({
      format: this.format,
      language: this.data.language,
      sourceCode: this.data.sourceCode,
      entryPoint: this.data.entryPoint,
    });
    return createHash('sha256').update(rawContent).digest('hex');
  }

  public serialize(): Record<string, unknown> {
    return {
      format: this.format,
      language: this.data.language,
      sourceCode: this.data.sourceCode,
      entryPoint: this.data.entryPoint,
      customInput: this.data.customInput,
    };
  }

  public static fromJSON(raw: Record<string, unknown>): CodeSubmissionPayload {
    return new CodeSubmissionPayload({
      language: String(raw.language || 'javascript') as ProgrammingLanguage,
      sourceCode: String(raw.sourceCode || ''),
      entryPoint: raw.entryPoint ? String(raw.entryPoint) : undefined,
      customInput: raw.customInput ? String(raw.customInput) : undefined,
    });
  }
}
