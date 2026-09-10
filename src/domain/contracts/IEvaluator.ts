import { ISubmissionPayload } from './ISubmissionPayload';
import { Problem } from '../entities/Problem';
import { Evaluation } from '../entities/Evaluation';

export interface IEvaluator {
  readonly id: string;
  readonly name: string;
  evaluate(submission: ISubmissionPayload, problem: Problem, attemptId: string): Promise<Evaluation>;
}
