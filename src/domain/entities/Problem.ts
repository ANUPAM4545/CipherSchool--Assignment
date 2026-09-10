import { ValidationError } from '../exceptions/DomainExceptions';
import { ProgrammingLanguage } from '../contracts/ProgrammingLanguage';
import { TestCase } from '../contracts/ICodeExecutionAdapter';

export type ProblemDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ProblemType = 'LLD' | 'CODING';

export interface CodingExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingProblemConfig {
  entryPoint: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: CodingExample[];
  visibleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  starterCode: Record<ProgrammingLanguage, string>;
  allowedLanguages: ProgrammingLanguage[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export interface ProblemProps {
  id: string;
  title: string;
  slug: string;
  difficulty: ProblemDifficulty;
  type?: ProblemType;
  shortDescription: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  constraints: string[];
  conceptsPracticed: string[];
  rubricDimensions?: string[];
  codingConfig?: CodingProblemConfig;
  createdAt?: Date;
}

export class Problem {
  public static readonly DEFAULT_RUBRIC_DIMENSIONS = [
    'Requirement Understanding',
    'Class Responsibilities',
    'Coupling & Cohesion',
    'Encapsulation & Interfaces',
    'Abstraction & Pattern Fitness',
    'Extensibility',
    'Edge Cases & Testability',
    'Quality of Explanation',
  ];

  public readonly id: string;
  public readonly title: string;
  public readonly slug: string;
  public readonly difficulty: ProblemDifficulty;
  public readonly type: ProblemType;
  public readonly shortDescription: string;
  public readonly functionalRequirements: ReadonlyArray<string>;
  public readonly nonFunctionalRequirements: ReadonlyArray<string>;
  public readonly constraints: ReadonlyArray<string>;
  public readonly conceptsPracticed: ReadonlyArray<string>;
  public readonly rubricDimensions: ReadonlyArray<string>;
  public readonly codingConfig?: CodingProblemConfig;
  public readonly createdAt: Date;

  constructor(props: ProblemProps) {
    if (!props.id) throw new ValidationError(['Problem ID is required']);
    if (!props.title) throw new ValidationError(['Problem title is required']);
    if (!props.slug) throw new ValidationError(['Problem slug is required']);

    this.id = props.id;
    this.title = props.title.trim();
    this.slug = props.slug.trim().toLowerCase();
    this.difficulty = props.difficulty;
    this.type = props.type || 'LLD';
    this.shortDescription = props.shortDescription.trim();
    this.functionalRequirements = [...props.functionalRequirements];
    this.nonFunctionalRequirements = [...props.nonFunctionalRequirements];
    this.constraints = [...props.constraints];
    this.conceptsPracticed = [...props.conceptsPracticed];
    this.rubricDimensions =
      props.rubricDimensions && props.rubricDimensions.length > 0
        ? [...props.rubricDimensions]
        : [...Problem.DEFAULT_RUBRIC_DIMENSIONS];
    this.codingConfig = props.codingConfig;
    this.createdAt = props.createdAt || new Date();
  }

  public get isCoding(): boolean {
    return this.type === 'CODING';
  }

  public get isLLD(): boolean {
    return this.type === 'LLD';
  }

  /**
   * Returns all test cases (visible + hidden) for authoritative server-side execution.
   */
  public getAllTestCases(): TestCase[] {
    if (!this.codingConfig) return [];
    const visible = this.codingConfig.visibleTestCases.map((t) => ({ ...t, isHidden: false }));
    const hidden = this.codingConfig.hiddenTestCases.map((t) => ({ ...t, isHidden: true }));
    return [...visible, ...hidden];
  }

  /**
   * Authoritative server representation.
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      slug: this.slug,
      difficulty: this.difficulty,
      type: this.type,
      shortDescription: this.shortDescription,
      functionalRequirements: this.functionalRequirements,
      nonFunctionalRequirements: this.nonFunctionalRequirements,
      constraints: this.constraints,
      conceptsPracticed: this.conceptsPracticed,
      rubricDimensions: this.rubricDimensions,
      codingConfig: this.codingConfig,
      createdAt: this.createdAt.toISOString(),
    };
  }

  /**
   * CRITICAL SECURITY METHOD:
   * Client-facing serialization that strips hidden test cases.
   * Client receives ONLY visibleTestCases and the count of hiddenTestCases.
   * Hidden test case inputs and expected outputs NEVER leave the server.
   */
  public toClientJSON(): Record<string, unknown> {
    let sanitizedCodingConfig: Record<string, unknown> | undefined = undefined;

    if (this.codingConfig) {
      sanitizedCodingConfig = {
        entryPoint: this.codingConfig.entryPoint,
        inputFormat: this.codingConfig.inputFormat,
        outputFormat: this.codingConfig.outputFormat,
        examples: this.codingConfig.examples,
        visibleTestCases: this.codingConfig.visibleTestCases.map((t) => ({
          id: t.id,
          input: t.input,
          expectedOutput: t.expectedOutput,
          explanation: t.explanation,
          isHidden: false,
        })),
        hiddenTestCasesCount: this.codingConfig.hiddenTestCases.length,
        starterCode: this.codingConfig.starterCode,
        allowedLanguages: this.codingConfig.allowedLanguages,
        timeLimitMs: this.codingConfig.timeLimitMs,
        memoryLimitMb: this.codingConfig.memoryLimitMb,
      };
    }

    return {
      id: this.id,
      title: this.title,
      slug: this.slug,
      difficulty: this.difficulty,
      type: this.type,
      shortDescription: this.shortDescription,
      functionalRequirements: this.functionalRequirements,
      nonFunctionalRequirements: this.nonFunctionalRequirements,
      constraints: this.constraints,
      conceptsPracticed: this.conceptsPracticed,
      rubricDimensions: this.rubricDimensions,
      codingConfig: sanitizedCodingConfig,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
