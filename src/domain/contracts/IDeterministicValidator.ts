import { ISubmissionPayload, ValidationResult } from './ISubmissionPayload';
import { Problem } from '../entities/Problem';

export interface IDeterministicValidator {
  readonly id: string;
  validate(submission: ISubmissionPayload, problem: Problem): ValidationResult;
}
