import { IProblemRepository } from '../../domain/repositories/IProblemRepository';
import { Problem } from '../../domain/entities/Problem';
import { EntityNotFoundError } from '../../domain/exceptions/DomainExceptions';

export class GetProblemsUseCase {
  constructor(private readonly problemRepo: IProblemRepository) {}

  public async execute(): Promise<Problem[]> {
    return await this.problemRepo.findAll();
  }
}

export class GetProblemUseCase {
  constructor(private readonly problemRepo: IProblemRepository) {}

  public async execute(slugOrId: string): Promise<Problem> {
    let problem = await this.problemRepo.findBySlug(slugOrId);
    if (!problem) {
      problem = await this.problemRepo.findById(slugOrId);
    }
    if (!problem) {
      throw new EntityNotFoundError('Problem', slugOrId);
    }
    return problem;
  }
}
