import { SubmissionPayload, ValidationResult } from '../contracts/ISubmissionPayload';
import { createHash } from 'crypto';

export interface StructuredTextData {
  requirementsUnderstanding: string;
  assumptionsAndConstraints: string;
  classesAndEntities: string;
  responsibilities: string;
  relationshipsAndInterfaces: string;
  patternsAndTradeoffs: string;
  edgeCasesAndReasoning: string;
}

export class StructuredTextPayload extends SubmissionPayload {
  public static readonly FORMAT = 'STRUCTURED_TEXT';
  readonly format = StructuredTextPayload.FORMAT;

  private static readonly MIN_SECTION_CHARS = 20;

  constructor(public readonly data: StructuredTextData) {
    super();
  }

  public validateStructure(): ValidationResult {
    const errors: string[] = [];

    const sectionChecks: Array<{ name: keyof StructuredTextData; label: string }> = [
      { name: 'requirementsUnderstanding', label: 'Requirements Understanding' },
      { name: 'assumptionsAndConstraints', label: 'Assumptions and Constraints' },
      { name: 'classesAndEntities', label: 'Classes and Entities' },
      { name: 'responsibilities', label: 'Responsibilities' },
      { name: 'relationshipsAndInterfaces', label: 'Relationships and Interfaces' },
      { name: 'patternsAndTradeoffs', label: 'Patterns and Trade-offs' },
      { name: 'edgeCasesAndReasoning', label: 'Edge Cases and Reasoning' },
    ];

    for (const { name, label } of sectionChecks) {
      const val = this.data[name]?.trim() || '';
      if (val.length === 0) {
        errors.push(`Missing required section: '${label}'`);
      } else if (val.length < StructuredTextPayload.MIN_SECTION_CHARS) {
        errors.push(
          `Section '${label}' is too short (minimum ${StructuredTextPayload.MIN_SECTION_CHARS} characters required, provided ${val.length})`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public toEvaluationContext(): string {
    return [
      `### 1. Requirements Understanding`,
      this.data.requirementsUnderstanding.trim(),
      ``,
      `### 2. Assumptions & Constraints`,
      this.data.assumptionsAndConstraints.trim(),
      ``,
      `### 3. Classes & Entities`,
      this.data.classesAndEntities.trim(),
      ``,
      `### 4. Class Responsibilities`,
      this.data.responsibilities.trim(),
      ``,
      `### 5. Relationships & Interfaces`,
      this.data.relationshipsAndInterfaces.trim(),
      ``,
      `### 6. Design Patterns & Architectural Trade-offs`,
      this.data.patternsAndTradeoffs.trim(),
      ``,
      `### 7. Edge Cases & Concurrency / Testability Reasoning`,
      this.data.edgeCasesAndReasoning.trim(),
    ].join('\n');
  }

  public calculateHash(): string {
    const rawContent = JSON.stringify(this.serialize());
    return createHash('sha256').update(rawContent).digest('hex');
  }

  public serialize(): Record<string, unknown> {
    return {
      format: this.format,
      requirementsUnderstanding: this.data.requirementsUnderstanding,
      assumptionsAndConstraints: this.data.assumptionsAndConstraints,
      classesAndEntities: this.data.classesAndEntities,
      responsibilities: this.data.responsibilities,
      relationshipsAndInterfaces: this.data.relationshipsAndInterfaces,
      patternsAndTradeoffs: this.data.patternsAndTradeoffs,
      edgeCasesAndReasoning: this.data.edgeCasesAndReasoning,
    };
  }

  public static fromJSON(raw: Record<string, unknown>): StructuredTextPayload {
    return new StructuredTextPayload({
      requirementsUnderstanding: String(raw.requirementsUnderstanding || ''),
      assumptionsAndConstraints: String(raw.assumptionsAndConstraints || ''),
      classesAndEntities: String(raw.classesAndEntities || ''),
      responsibilities: String(raw.responsibilities || ''),
      relationshipsAndInterfaces: String(raw.relationshipsAndInterfaces || ''),
      patternsAndTradeoffs: String(raw.patternsAndTradeoffs || ''),
      edgeCasesAndReasoning: String(raw.edgeCasesAndReasoning || ''),
    });
  }

  public getTotalWordCount(): number {
    return Object.values(this.data).reduce((total, section) => {
      const words = section.trim().split(/\s+/).filter(Boolean);
      return total + words.length;
    }, 0);
  }
}
