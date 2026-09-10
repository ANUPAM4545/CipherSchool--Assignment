import { describe, it, expect } from 'vitest';
import { SubmissionPayload, ValidationResult } from '../../src/domain/contracts/ISubmissionPayload';
import { Attempt } from '../../src/domain/entities/Attempt';
import { Submission } from '../../src/domain/entities/Submission';
import { Problem } from '../../src/domain/entities/Problem';
import { MockEvaluator } from '../mocks/MockEvaluator';

/**
 * CHANGE TEST A:
 * Verifies that a new submission format (Class Diagram Submission)
 * can be introduced cleanly by implementing SubmissionPayload WITHOUT
 * altering the Attempt aggregate, Submission entity, or practice flow.
 */
class DiagramSubmissionPayload extends SubmissionPayload {
  readonly format = 'CLASS_DIAGRAM';

  constructor(
    public readonly mermaidDiagram: string,
    public readonly architectureNotes: string
  ) {
    super();
  }

  public validateStructure(): ValidationResult {
    const errors: string[] = [];
    if (!this.mermaidDiagram || !this.mermaidDiagram.includes('classDiagram')) {
      errors.push('Invalid Mermaid class diagram format');
    }
    if (!this.architectureNotes || this.architectureNotes.trim().length < 20) {
      errors.push('Architecture notes must be at least 20 characters');
    }
    return { isValid: errors.length === 0, errors };
  }

  public toEvaluationContext(): string {
    return (
      `### Class Diagram (Mermaid):\n\`\`\`mermaid\n${this.mermaidDiagram}\n\`\`\`\n\n` +
      `### Architecture Notes & Trade-offs:\n${this.architectureNotes}`
    );
  }

  public calculateHash(): string {
    return `hash-diagram-${this.mermaidDiagram.length}-${this.architectureNotes.length}`;
  }

  public serialize(): Record<string, unknown> {
    return {
      format: this.format,
      mermaidDiagram: this.mermaidDiagram,
      architectureNotes: this.architectureNotes,
    };
  }
}

describe('Change Test A: Submission Extensibility', () => {
  const sampleProblem = new Problem({
    id: 'prob-uml',
    title: 'Elevator System',
    slug: 'elevator-system',
    difficulty: 'HARD',
    shortDescription: 'Multi-car elevator system',
    functionalRequirements: ['Dispatch elevator', 'Handle floor requests'],
    nonFunctionalRequirements: ['Extensible dispatch algorithm'],
    constraints: ['Max capacity'],
    conceptsPracticed: ['Strategy', 'Observer'],
  });

  it('allows DiagramSubmissionPayload to execute through the practice and submission flow seamlessly', async () => {
    const diagramPayload = new DiagramSubmissionPayload(
      `classDiagram
        ElevatorController --> ElevatorCar : manages
        ElevatorCar --> DoorState : has
        ElevatorController --> IDispatchStrategy : delegates`,
      'Implemented Strategy pattern for dispatching and State pattern for car motion states.'
    );

    expect(diagramPayload.validateStructure().isValid).toBe(true);

    const attempt = new Attempt({
      id: 'att-diagram-1',
      problemId: sampleProblem.id,
      learnerId: 'learner-uml',
    });

    const submission = new Submission({
      id: 'sub-diagram-1',
      attemptId: attempt.id,
      payload: diagramPayload,
    });

    // Verify submission flow works identically
    attempt.submit(submission);
    expect(attempt.state).toBe('SUBMITTED');
    expect(attempt.submission?.payload.format).toBe('CLASS_DIAGRAM');

    attempt.startEvaluation();
    expect(attempt.state).toBe('EVALUATING');

    // Verify evaluator consumes diagram payload without failure
    const evaluator = new MockEvaluator();
    const evaluation = await evaluator.evaluate(diagramPayload, sampleProblem, attempt.id);

    attempt.completeEvaluation(evaluation);
    expect(attempt.state).toBe('COMPLETED');
    expect(attempt.evaluation?.criteria.length).toBe(8);
  });
});
