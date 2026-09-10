export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ISubmissionPayload {
  readonly format: string;
  toEvaluationContext(): string;
  validateStructure(): ValidationResult;
  calculateHash(): string;
  serialize(): Record<string, unknown>;
}

export abstract class SubmissionPayload implements ISubmissionPayload {
  abstract readonly format: string;
  abstract toEvaluationContext(): string;
  abstract validateStructure(): ValidationResult;
  abstract calculateHash(): string;
  abstract serialize(): Record<string, unknown>;
}
