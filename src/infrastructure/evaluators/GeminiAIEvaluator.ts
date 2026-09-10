import { IEvaluator } from '../../domain/contracts/IEvaluator';
import { ISubmissionPayload } from '../../domain/contracts/ISubmissionPayload';
import { Problem } from '../../domain/entities/Problem';
import { Evaluation } from '../../domain/entities/Evaluation';
import { CriterionFeedback } from '../../domain/entities/CriterionFeedback';
import { StructuredTextPayload } from '../../domain/payloads/StructuredTextPayload';
import { extractAndParseJsonObject } from './JsonParserHelper';

const RUBRIC_DIMENSIONS = [
  'Requirement Understanding',
  'Class Responsibilities',
  'Coupling & Cohesion',
  'Encapsulation & Interfaces',
  'Abstraction & Pattern Fitness',
  'Extensibility',
  'Edge Cases & Testability',
  'Quality of Explanation',
] as const;

interface RawCriterion {
  criterion: string;
  score: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

interface RawEvaluationResponse {
  summary: string;
  criteria: RawCriterion[];
}

export class GeminiAIEvaluator implements IEvaluator {
  public readonly id = 'gemini-ai-evaluator';
  public readonly name = 'Gemini Cognitive LLD Evaluator';

  constructor(
    private readonly apiKey?: string,
    private readonly model?: string
  ) {}

  public async evaluate(
    submission: ISubmissionPayload,
    problem: Problem,
    attemptId: string
  ): Promise<Evaluation> {
    const key = (this.apiKey || process.env.GEMINI_API_KEY || '').trim();
    const model = (this.model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite').trim();

    // STRICT NON-NEGOTIABLE CHECK: Never silently fall back to mock evaluation
    if (!key || key === 'mock-key') {
      const errorMsg =
        'Gemini API key is not configured. Real AI evaluation requires a valid GEMINI_API_KEY in the environment.';
      console.error(
        `[GeminiEvaluator]\nattemptId=${attemptId}\nproblemId=${problem.id}\nstatus=failed\nerror=${errorMsg}`
      );
      throw new Error(errorMsg);
    }

    const submissionHash = submission.calculateHash();

    // Safe server-side audit logging
    console.log(
      `[GeminiEvaluator]\nattemptId=${attemptId}\nproblemId=${problem.id}\nsubmissionHash=${submissionHash}\nprovider=Gemini\nmodel=${model}\nstatus=requested`
    );

    try {
      const evaluation = await this.evaluateWithGemini(key, model, submission, problem, attemptId);

      console.log(
        `[GeminiEvaluator]\nattemptId=${attemptId}\nstatus=completed\ncriteria=${evaluation.criteria.length}\ntotalScore=${evaluation.totalScore}/${evaluation.maxTotalScore}\nrating=${evaluation.overallRating}`
      );

      return evaluation;
    } catch (err: unknown) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      console.error(
        `[GeminiEvaluator]\nattemptId=${attemptId}\nstatus=failed\nerror=${errorDetail}`
      );
      // Re-throw: Never fabricate or fall back to mock evaluations
      throw err instanceof Error ? err : new Error(errorDetail);
    }
  }

  private async evaluateWithGemini(
    key: string,
    model: string,
    submission: ISubmissionPayload,
    problem: Problem,
    attemptId: string
  ): Promise<Evaluation> {
    const prompt = this.buildPrompt(submission, problem);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(key)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(60000), // 60s hard timeout
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Unable to read response body';
      }
      throw new Error(
        `Gemini API HTTP Error ${response.status} (${response.statusText}): ${errorBody.slice(0, 300)}`
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      throw new Error('Gemini API returned an empty or unparseable response payload');
    }

    const parsed = extractAndParseJsonObject<RawEvaluationResponse>(rawText);

    // Validate structured response schema before mapping
    this.validateStructuredResponse(parsed);

    return this.mapToEvaluation(parsed, attemptId);
  }

  public buildPrompt(submission: ISubmissionPayload, problem: Problem): string {
    const submissionContent = this.formatSubmission(submission);

    return `You are a Principal Software Architect and Staff Interviewer conducting an objective, pedagogical Low-Level Design (LLD) technical evaluation.

PROBLEM SPECIFICATION:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.shortDescription}

Functional Requirements:
${problem.functionalRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Non-Functional Requirements:
${problem.nonFunctionalRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Constraints:
${problem.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

LEARNER'S SUBMITTED SOLUTION:
${submissionContent}

EVALUATION RUBRIC & INSTRUCTIONS:
You MUST evaluate the candidate's design across EXACTLY these 8 fixed LLD dimensions:
1. Requirement Understanding: Accurate comprehension of requirements, entity identification, and scale assumptions.
2. Class Responsibilities: Single Responsibility Principle (SRP), clean domain modeling, avoiding God Objects.
3. Coupling & Cohesion: Appropriate dependency management, modularity, dependency inversion vs tight coupling.
4. Encapsulation & Interfaces: Robust contracts, information hiding, proper access boundaries and abstractions.
5. Abstraction & Pattern Fitness: Appropriate application of design patterns (e.g., Strategy, Factory, State) without over-engineering.
6. Extensibility: Open-Closed Principle (OCP), ease of adding new requirements, rules, or entity variants.
7. Edge Cases & Testability: Concurrency safety, race conditions, boundary checks, exception handling, and mockability.
8. Quality of Explanation: Clear articulation of architectural trade-offs and rationale behind design decisions.

SCORING CALIBRATION & ANCHOR BENCHMARKS (STRICT DISCRIMINATION - DO NOT CLUSTER SCORES AT 7-8):
Evaluate each dimension with true engineering rigor. Differentiate sharply between shallow templates and deep technical designs:
- 1–3 (Inadequate / Missing): The criterion is omitted, fundamentally incorrect, or empty.
- 4–5 (Rudimentary / Surface-Level): High-level overview or generic lists of names/concepts without method signatures, contracts, or concrete interaction logic (e.g. merely stating "State pattern handles transitions" or "Inventory tracks items" without showing how). High-level template responses without technical depth MUST be scored in this 4–5 range.
- 6–7 (Competent): Solid conceptual baseline. Identifies domain entities, patterns, and basic flows. However, lacks technical depth in method contracts, concurrency mechanisms, or concrete edge-case recovery.
- 8–9 (Strong / Production-Grade): Comprehensive and technically precise. Details explicit method signatures, interface contracts, state transitions, concurrency locks/primitives (e.g., mutexes, atomic variables), and defensive failure recovery.
- 10 (Exemplary): Exceptional architectural depth, optimal design patterns with justifiable trade-offs, defensive concurrency guarantees, and production-ready completeness.

CRITICAL DISCRIMINATION & GROUNDING RULES:
- BE STRICT AND HONEST: If the candidate provided only a high-level summary or template with minimal detail, score it accurately in the 4–6 range. Do NOT default to giving 7 or 8 across all criteria.
- If the candidate removed information or omitted key responsibilities between iterations, lower the score accordingly.
- If the candidate added concrete interfaces, methods, concurrency locks, or edge-case handling, raise the score accordingly.
- GROUND ALL EVIDENCE IN THE LEARNER'S ACTUAL SUBMISSION. Citing verbatim text or exact class/method names from the submission is required.
- NEVER fabricate evidence. If the candidate did not address a criterion, explicitly state: "The submission does not provide evidence for this criterion."
- Confidence MUST be a number between 0.0 and 1.0 reflecting your assessment certainty.
- Provide a constructive, actionable suggestion for each criterion to guide candidate improvement.
- Provide an overarching 2-4 sentence executive architectural summary in "summary".

RESPONSE SCHEMA (Pure JSON only, no markdown formatting):
{
  "summary": "Overall architecture critique...",
  "criteria": [
    {
      "criterion": "Requirement Understanding",
      "score": 8,
      "evidence": "Direct citation or quote from candidate submission",
      "concern": "Specific limitation or architectural risk",
      "suggestion": "Specific, actionable improvement recommendation",
      "confidence": 0.95
    }
  ]
}`;
  }

  private formatSubmission(submission: ISubmissionPayload): string {
    if (submission instanceof StructuredTextPayload) {
      return `Requirements Understanding:
${submission.data.requirementsUnderstanding || 'None provided'}

Assumptions & Constraints:
${submission.data.assumptionsAndConstraints || 'None provided'}

Classes & Entities:
${submission.data.classesAndEntities || 'None provided'}

Class Responsibilities:
${submission.data.responsibilities || 'None provided'}

Relationships & Interfaces:
${submission.data.relationshipsAndInterfaces || 'None provided'}

Patterns & Trade-offs:
${submission.data.patternsAndTradeoffs || 'None provided'}

Edge Cases / Concurrency / Testability:
${submission.data.edgeCasesAndReasoning || 'None provided'}`;
    }

    return submission.toEvaluationContext();
  }

  private validateStructuredResponse(raw: RawEvaluationResponse): void {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Gemini response is not a valid JSON object');
    }

    if (!raw.summary || typeof raw.summary !== 'string' || raw.summary.trim().length === 0) {
      throw new Error('Gemini response missing or empty "summary" field');
    }

    if (!Array.isArray(raw.criteria)) {
      throw new Error('Gemini response missing "criteria" array');
    }

    if (raw.criteria.length !== 8) {
      throw new Error(
        `Gemini response must contain exactly 8 rubric criteria, received ${raw.criteria.length}`
      );
    }

    const seenDimensions = new Set<string>();

    for (const c of raw.criteria) {
      if (!c.criterion || typeof c.criterion !== 'string') {
        throw new Error('Criterion item missing "criterion" name');
      }

      // Check against standard dimensions
      const matched = RUBRIC_DIMENSIONS.find(
        (d) => d.toLowerCase() === c.criterion.trim().toLowerCase()
      );
      if (!matched) {
        throw new Error(`Unknown rubric dimension returned by Gemini: "${c.criterion}"`);
      }

      if (seenDimensions.has(matched)) {
        throw new Error(`Duplicate criterion dimension returned by Gemini: "${matched}"`);
      }
      seenDimensions.add(matched);

      if (typeof c.score !== 'number' || isNaN(c.score) || c.score < 1 || c.score > 10) {
        throw new Error(
          `Invalid score for criterion "${c.criterion}": must be a number between 1 and 10, got ${c.score}`
        );
      }

      if (!c.evidence || typeof c.evidence !== 'string' || c.evidence.trim().length === 0) {
        throw new Error(`Missing or empty "evidence" for criterion "${c.criterion}"`);
      }

      if (!c.concern || typeof c.concern !== 'string' || c.concern.trim().length === 0) {
        throw new Error(`Missing or empty "concern" for criterion "${c.criterion}"`);
      }

      if (!c.suggestion || typeof c.suggestion !== 'string' || c.suggestion.trim().length === 0) {
        throw new Error(`Missing or empty "suggestion" for criterion "${c.criterion}"`);
      }

      if (typeof c.confidence !== 'number' || isNaN(c.confidence) || c.confidence < 0 || c.confidence > 1) {
        throw new Error(
          `Invalid confidence for criterion "${c.criterion}": must be between 0.0 and 1.0, got ${c.confidence}`
        );
      }
    }
  }

  private mapToEvaluation(raw: RawEvaluationResponse, attemptId: string): Evaluation {
    const criteria = raw.criteria.map((c) => {
      // Normalize dimension name to canonical casing
      const canonicalName =
        RUBRIC_DIMENSIONS.find((d) => d.toLowerCase() === c.criterion.trim().toLowerCase()) ||
        c.criterion.trim();

      return new CriterionFeedback({
        criterion: canonicalName,
        score: c.score,
        evidence: c.evidence.trim(),
        concern: c.concern.trim(),
        suggestion: c.suggestion.trim(),
        confidence: c.confidence,
      });
    });

    return new Evaluation({
      id: `eval-${attemptId}-${Date.now()}`,
      attemptId,
      evaluatorId: this.id,
      summary: raw.summary.trim(),
      criteria,
    });
  }
}
