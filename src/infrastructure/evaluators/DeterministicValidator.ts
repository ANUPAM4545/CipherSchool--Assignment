import { IDeterministicValidator } from '../../domain/contracts/IDeterministicValidator';
import { ISubmissionPayload, ValidationResult } from '../../domain/contracts/ISubmissionPayload';
import { Problem } from '../../domain/entities/Problem';

export class DeterministicValidator implements IDeterministicValidator {
  public readonly id = 'deterministic-validator';

  public validate(submission: ISubmissionPayload, problem: Problem): ValidationResult {
    const errors: string[] = [];

    // 1. Structural payload checks (all required sections & minimum length)
    const payloadResult = submission.validateStructure();
    if (!payloadResult.isValid) {
      errors.push(...payloadResult.errors);
    }

    // 2. Ensure problem context exists
    if (!problem || !problem.id) {
      errors.push('Problem context is invalid or missing');
    }

    // 3. Minimum overall evaluation context size (must have at least 150 characters total)
    const context = submission.toEvaluationContext();
    if (context.trim().length < 150) {
      errors.push(
        `Submission is too brief to be meaningfully evaluated for LLD (minimum 150 characters required, provided ${context.trim().length})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
