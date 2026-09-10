import { ISubmissionPayload } from '../../domain/contracts/ISubmissionPayload';
import { Problem } from '../../domain/entities/Problem';
import { Evaluation } from '../../domain/entities/Evaluation';
import { CriterionFeedback } from '../../domain/entities/CriterionFeedback';
import { CodeSubmissionPayload } from '../../domain/payloads/CodeSubmissionPayload';
import { ExecutionResult } from '../../domain/entities/ExecutionResult';
import { extractAndParseJsonObject } from './JsonParserHelper';

const CODING_RUBRIC_DIMENSIONS = [
  'Algorithmic Correctness & Logic',
  'Time Complexity',
  'Space Complexity',
  'Code Quality & Clean Architecture',
  'Idiomatic Language Usage',
  'Optimization & Alternative Approaches',
] as const;

interface RawCodingCriterion {
  criterion: string;
  score: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

interface RawCodingEvaluationResponse {
  summary: string;
  estimatedTimeComplexity: string;
  timeComplexityReasoning: string;
  estimatedSpaceComplexity: string;
  spaceComplexityReasoning: string;
  criteria: RawCodingCriterion[];
}

export class CodingAIEvaluator {
  public readonly id = 'coding-gemini-evaluator';
  public readonly name = 'Gemini Cognitive Code Reviewer';

  constructor(
    private readonly apiKey?: string,
    private readonly model?: string
  ) {}

  public async evaluate(
    submission: CodeSubmissionPayload,
    problem: Problem,
    executionResult: ExecutionResult,
    attemptId: string
  ): Promise<Evaluation> {
    const key = (this.apiKey || process.env.GEMINI_API_KEY || '').trim();
    const model = (this.model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite').trim();

    // STRICT NON-NEGOTIABLE CHECK: Never silently fall back to mock evaluation
    if (!key || key === 'mock-key') {
      const errorMsg =
        'Gemini API key is not configured. Real AI evaluation requires a valid GEMINI_API_KEY in the environment.';
      console.error(
        `[CodingEvaluator]\nattemptId=${attemptId}\nproblemId=${problem.id}\nstatus=failed\nerror=${errorMsg}`
      );
      throw new Error(errorMsg);
    }

    const submissionHash = submission.calculateHash();

    // Safe server-side audit logging
    console.log(
      `[CodingEvaluator]\nattemptId=${attemptId}\nproblemId=${problem.id}\nlanguage=${submission.data.language}\ntestsPassed=${executionResult.testsPassed}/${executionResult.totalTests}\nsubmissionHash=${submissionHash}\nprovider=Gemini\nmodel=${model}\nstatus=requested`
    );

    try {
      const prompt = this.buildPrompt(submission, problem, executionResult);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(key)}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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

      const parsed = extractAndParseJsonObject<RawCodingEvaluationResponse>(rawText);

      this.validateStructuredResponse(parsed);

      const evaluation = this.mapToEvaluation(parsed, executionResult, attemptId);

      console.log(
        `[CodingEvaluator]\nattemptId=${attemptId}\nstatus=completed\ncriteria=${evaluation.criteria.length}\ntotalScore=${evaluation.totalScore}/${evaluation.maxTotalScore}\nrating=${evaluation.overallRating}`
      );

      return evaluation;
    } catch (err: unknown) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      console.error(
        `[CodingEvaluator]\nattemptId=${attemptId}\nstatus=failed\nerror=${errorDetail}`
      );
      throw err instanceof Error ? err : new Error(errorDetail);
    }
  }

  public buildPrompt(
    submission: CodeSubmissionPayload,
    problem: Problem,
    executionResult: ExecutionResult
  ): string {
    const visibleResults = executionResult.testCaseResults
      .filter((tc) => !tc.isHidden)
      .map(
        (tc, i) =>
          `Test #${i + 1} (${tc.status}): Input: ${tc.input} | Expected: ${tc.expectedOutput} | Actual: ${
            tc.actualOutput || 'N/A'
          } ${tc.error ? `| Error: ${tc.error}` : ''}`
      )
      .join('\n');

    const hiddenCount = executionResult.testCaseResults.filter((tc) => tc.isHidden).length;
    const hiddenPassed = executionResult.testCaseResults.filter(
      (tc) => tc.isHidden && tc.status === 'PASSED'
    ).length;

    return `You are a Principal Software Architect and Lead Algorithm Interviewer conducting an objective, pedagogical code review of a candidate's submitted solution.

AUTHORITATIVE DETERMINISTIC TEST EXECUTION RESULTS (SOURCE OF TRUTH):
- Status: ${executionResult.status}
- Tests Passed: ${executionResult.testsPassed} / ${executionResult.totalTests} (${executionResult.passPercentage}%)
- Visible Test Summary:
${visibleResults || 'None'}
- Hidden Test Summary: ${hiddenPassed} / ${hiddenCount} passed
- Total Execution Time: ${executionResult.executionTimeMs} ms
- Compiler/Runtime Output:
Stdout: ${executionResult.stdout || 'None'}
Stderr: ${executionResult.stderr || 'None'}

CRITICAL ACCURACY INVARIANT:
- The execution results above are the absolute, deterministic ground truth.
- DO NOT override or hallucinate test results. If the execution engine reported failure, you must acknowledge the failure and analyze the cause.
- If all tests passed, evaluate efficiency, clean code, and edge-case resilience.

PROBLEM SPECIFICATION:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.shortDescription}
Constraints:
${problem.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

CANDIDATE'S SUBMITTED SOURCE CODE (${submission.data.language.toUpperCase()}):
\`\`\`${submission.data.language}
${submission.data.sourceCode.trim()}
\`\`\`

EVALUATION RUBRIC (Evaluate across EXACTLY these 6 dimensions):
1. Algorithmic Correctness & Logic: Analyze code logic, correctness, and diagnose any test failures grounded in the deterministic test results.
2. Time Complexity: Estimate Big-O time complexity with clear step-by-step reasoning.
3. Space Complexity: Estimate Big-O auxiliary space complexity with clear reasoning.
4. Code Quality & Clean Architecture: Variable naming, modularity, readability, and separation of concerns.
5. Idiomatic Language Usage: Adherence to ${submission.data.language.toUpperCase()} modern idioms, standard libraries, and conventions.
6. Optimization & Alternative Approaches: Actionable recommendations for alternative data structures, algorithms, or micro-optimizations.

SCORING CALIBRATION & ANCHOR BENCHMARKS (1 to 10 scale, do not cluster scores at 7-8):
- 1–3 (Broken / Inadequate): Code fails to compile, crashes, fails all tests, or is an un-implemented stub.
- 4–5 (Suboptimal / Brute Force): Functionally solves basic cases but uses suboptimal Big-O complexity (e.g. O(n^2) nested loop where O(n) hash map is expected), poor naming, or lacks defensive checks.
- 6–7 (Competent): Correct solution that passes tests, but with minor code cleanliness, readability, or standard library efficiency gaps.
- 8–9 (Strong / Production-Grade): Optimal time and space complexity matching theoretical lower bounds, clean idiomatic code, clear naming, and robust boundary checking.
- 10 (Exemplary): Flawless algorithmic elegance, optimal data structures, clean modularity, and comprehensive edge-case resilience.

RULES FOR EVIDENCE GROUNDING:
- Every criterion MUST cite verbatim code from the learner's actual submitted source code in the "evidence" field.
- Score each dimension from 1 to 10 based on true merit and technical depth. Do NOT default to giving 7 or 8 across all criteria.
- Confidence must be between 0.0 and 1.0.

RESPONSE SCHEMA (Pure JSON only):
{
  "summary": "2-3 sentence executive review of the candidate's code, noting correctness and algorithmic efficiency.",
  "estimatedTimeComplexity": "O(n)",
  "timeComplexityReasoning": "Detailed derivation of time complexity based on loops, recursions, or library calls.",
  "estimatedSpaceComplexity": "O(n)",
  "spaceComplexityReasoning": "Detailed derivation of space complexity based on auxiliary structures.",
  "criteria": [
    {
      "criterion": "Algorithmic Correctness & Logic",
      "score": 8,
      "evidence": "Verbatim quote of key algorithm logic from source code",
      "concern": "Specific gap, edge-case vulnerability, or failure explanation",
      "suggestion": "Specific, actionable improvement recommendation",
      "confidence": 0.95
    }
  ]
}`;
  }

  private validateStructuredResponse(raw: RawCodingEvaluationResponse): void {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Gemini response is not a valid JSON object');
    }

    if (!raw.summary || typeof raw.summary !== 'string' || raw.summary.trim().length === 0) {
      throw new Error('Gemini response missing or empty "summary" field');
    }

    if (!Array.isArray(raw.criteria)) {
      throw new Error('Gemini response missing "criteria" array');
    }

    if (raw.criteria.length !== 6) {
      throw new Error(
        `Gemini coding response must contain exactly 6 rubric criteria, received ${raw.criteria.length}`
      );
    }

    const seenDimensions = new Set<string>();

    for (const c of raw.criteria) {
      if (!c.criterion || typeof c.criterion !== 'string') {
        throw new Error('Criterion item missing "criterion" name');
      }

      const matched = CODING_RUBRIC_DIMENSIONS.find(
        (d) => d.toLowerCase() === c.criterion.trim().toLowerCase()
      );
      if (!matched) {
        throw new Error(`Unknown coding rubric dimension returned by Gemini: "${c.criterion}"`);
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

  private mapToEvaluation(
    raw: RawCodingEvaluationResponse,
    executionResult: ExecutionResult,
    attemptId: string
  ): Evaluation {
    const criteria = raw.criteria.map((c) => {
      const canonicalName =
        CODING_RUBRIC_DIMENSIONS.find((d) => d.toLowerCase() === c.criterion.trim().toLowerCase()) ||
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

    const enrichedSummary = [
      raw.summary.trim(),
      `\n\n**Deterministic Execution Outcome**: ${executionResult.testsPassed} / ${executionResult.totalTests} tests passed (${executionResult.executionTimeMs}ms).`,
      raw.estimatedTimeComplexity ? `\n• **AI-Analyzed Time Complexity**: \`${raw.estimatedTimeComplexity}\` (${raw.timeComplexityReasoning})` : '',
      raw.estimatedSpaceComplexity ? `\n• **AI-Analyzed Space Complexity**: \`${raw.estimatedSpaceComplexity}\` (${raw.spaceComplexityReasoning})` : '',
    ]
      .filter(Boolean)
      .join('');

    return new Evaluation({
      id: `eval-coding-${attemptId}-${Date.now()}`,
      attemptId,
      evaluatorId: this.id,
      summary: enrichedSummary,
      criteria,
    });
  }
}
