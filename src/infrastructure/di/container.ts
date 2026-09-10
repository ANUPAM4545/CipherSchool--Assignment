import { getRepositoryContainer } from '../db';
import { DeterministicValidator } from '../evaluators/DeterministicValidator';
import { GeminiAIEvaluator } from '../evaluators/GeminiAIEvaluator';
import { CodingAIEvaluator } from '../evaluators/CodingAIEvaluator';
import { CompositeEvaluator } from '../evaluators/CompositeEvaluator';
import { CodeExecutionService } from '../execution/CodeExecutionService';
import { JavaScriptExecutionAdapter } from '../execution/JavaScriptExecutionAdapter';
import { PythonExecutionAdapter } from '../execution/PythonExecutionAdapter';
import {
  GetProblemsUseCase,
  GetProblemUseCase,
  StartAttemptUseCase,
  SubmitSolutionUseCase,
  EvaluateAttemptUseCase,
  GetAttemptHistoryUseCase,
  RetryAttemptUseCase,
} from '../../application';

import { IAttemptRepository } from '../../domain';

export interface AppContainer {
  getProblems: GetProblemsUseCase;
  getProblem: GetProblemUseCase;
  startAttempt: StartAttemptUseCase;
  submitSolution: SubmitSolutionUseCase;
  evaluateAttempt: EvaluateAttemptUseCase;
  getAttemptHistory: GetAttemptHistoryUseCase;
  retryAttempt: RetryAttemptUseCase;
  codeExecutionService: CodeExecutionService;
  attemptRepo: IAttemptRepository;
}

let appContainerInstance: AppContainer | null = null;

export async function getAppContainer(): Promise<AppContainer> {
  if (appContainerInstance) {
    return appContainerInstance;
  }

  const repos = await getRepositoryContainer();
  const validator = new DeterministicValidator();
  const aiEvaluator = new GeminiAIEvaluator();
  const codingEvaluator = new CodingAIEvaluator();

  const jsAdapter = new JavaScriptExecutionAdapter();
  const pyAdapter = new PythonExecutionAdapter();
  const codeExecutionService = new CodeExecutionService([jsAdapter, pyAdapter]);

  const compositeEvaluator = new CompositeEvaluator(
    validator,
    aiEvaluator,
    codeExecutionService,
    codingEvaluator
  );

  const container: AppContainer = {
    getProblems: new GetProblemsUseCase(repos.problemRepo),
    getProblem: new GetProblemUseCase(repos.problemRepo),
    startAttempt: new StartAttemptUseCase(repos.problemRepo, repos.attemptRepo),
    submitSolution: new SubmitSolutionUseCase(repos.attemptRepo),
    evaluateAttempt: new EvaluateAttemptUseCase(
      repos.attemptRepo,
      repos.problemRepo,
      compositeEvaluator
    ),
    getAttemptHistory: new GetAttemptHistoryUseCase(repos.attemptRepo),
    retryAttempt: new RetryAttemptUseCase(repos.attemptRepo),
    codeExecutionService,
    attemptRepo: repos.attemptRepo,
  };

  appContainerInstance = container;
  return container;
}
