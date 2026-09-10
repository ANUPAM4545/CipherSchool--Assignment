import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeterministicValidator } from '../../src/infrastructure/evaluators/DeterministicValidator';
import { GeminiAIEvaluator } from '../../src/infrastructure/evaluators/GeminiAIEvaluator';
import { CompositeEvaluator } from '../../src/infrastructure/evaluators/CompositeEvaluator';
import { StructuredTextPayload } from '../../src/domain/payloads/StructuredTextPayload';
import { Problem } from '../../src/domain/entities/Problem';
import { ValidationError } from '../../src/domain/exceptions/DomainExceptions';
import { MockEvaluator } from '../mocks/MockEvaluator';

describe('Evaluators & Validators (Infrastructure Layer)', () => {
  const sampleProblem = new Problem({
    id: 'prob-parking-lot',
    title: 'Parking Lot System',
    slug: 'parking-lot-system',
    difficulty: 'MEDIUM',
    shortDescription: 'Design an object-oriented multi-level parking lot supporting diverse vehicles.',
    functionalRequirements: [
      'Multi-level parking with spots for Motorcycle, Compact, Large SUV, and EV.',
      'Nearest spot allocation based on entry gate.',
      'Ticket generation on entry and fee calculation on exit.',
    ],
    nonFunctionalRequirements: [
      'Concurrency safe without race conditions.',
      'Extensible for new vehicle types.',
    ],
    constraints: [
      'Single vehicle per spot.',
      'Electric spots reserved for EVs.',
    ],
    conceptsPracticed: ['Strategy Pattern', 'Factory Pattern'],
  });

  const validPayload = new StructuredTextPayload({
    requirementsUnderstanding: 'Design an automated parking lot accommodating cars, bikes, and trucks across 4 levels.',
    assumptionsAndConstraints: 'Single entry gate, multi-floor building, hourly tariff with peak surge pricing.',
    classesAndEntities: 'Vehicle, Car, Bike, ParkingSpot, Level, ParkingLot, Ticket, Payment.',
    responsibilities: 'ParkingLot coordinates levels; ParkingSpot manages occupancy lock; Ticket tracks fees.',
    relationshipsAndInterfaces: 'IPricingStrategy implemented by HourlyTariff; Level contains ParkingSpots.',
    patternsAndTradeoffs: 'Used Strategy pattern for pricing to allow runtime tariff changes without modifying core logic.',
    edgeCasesAndReasoning: 'Addressed concurrent entry race conditions with spot reservation locks and fine-grained mutex.',
  });

  describe('DeterministicValidator', () => {
    const validator = new DeterministicValidator();

    it('passes a fully specified, meaningful payload', () => {
      const result = validator.validate(validPayload, sampleProblem);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects an empty or too brief payload', () => {
      const emptyPayload = new StructuredTextPayload({
        requirementsUnderstanding: 'Short',
        assumptionsAndConstraints: '',
        classesAndEntities: '',
        responsibilities: '',
        relationshipsAndInterfaces: '',
        patternsAndTradeoffs: '',
        edgeCasesAndReasoning: '',
      });

      const result = validator.validate(emptyPayload, sampleProblem);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GeminiAIEvaluator (Real Gemini Cognitive Engine)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
      delete process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
      process.env = originalEnv;
      vi.restoreAllMocks();
    });

    it('1 & 2: Prompt includes actual problem requirements and learner submission content dynamically', () => {
      const evaluator = new GeminiAIEvaluator('valid-test-key');
      const prompt = evaluator.buildPrompt(validPayload, sampleProblem);

      // Must receive actual problem specification
      expect(prompt).toContain('Parking Lot System');
      expect(prompt).toContain('Multi-level parking with spots for Motorcycle, Compact, Large SUV, and EV');
      expect(prompt).toContain('Single vehicle per spot');

      // Must receive actual learner submission content
      expect(prompt).toContain('Design an automated parking lot accommodating cars, bikes, and trucks across 4 levels');
      expect(prompt).toContain('IPricingStrategy implemented by HourlyTariff');
      expect(prompt).toContain('Used Strategy pattern for pricing');
      expect(prompt).toContain('spot reservation locks and fine-grained mutex');

      // Must enforce the 8 fixed dimensions
      expect(prompt).toContain('1. Requirement Understanding');
      expect(prompt).toContain('2. Class Responsibilities');
      expect(prompt).toContain('3. Coupling & Cohesion');
      expect(prompt).toContain('4. Encapsulation & Interfaces');
      expect(prompt).toContain('5. Abstraction & Pattern Fitness');
      expect(prompt).toContain('6. Extensibility');
      expect(prompt).toContain('7. Edge Cases & Testability');
      expect(prompt).toContain('8. Quality of Explanation');

      // Must enforce evidence grounding
      expect(prompt).toContain('GROUND ALL EVIDENCE IN THE LEARNER\'S ACTUAL SUBMISSION');
    });

    it('3: Parses structured Gemini JSON and constructs Evaluation entity with derived scores', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Solid architectural design utilizing strategy pattern for pricing.',
                    criteria: [
                      { criterion: 'Requirement Understanding', score: 8, evidence: 'Candidate identified 4 levels and diverse vehicles', concern: 'Peak scale limits not addressed', suggestion: 'Define explicit throughput', confidence: 0.95 },
                      { criterion: 'Class Responsibilities', score: 9, evidence: 'ParkingLot coordinates, Spot locks', concern: 'Spot holds some logic', suggestion: 'Extract spot state', confidence: 0.92 },
                      { criterion: 'Coupling & Cohesion', score: 8, evidence: 'IPricingStrategy separates tariff logic', concern: 'Direct spot list reference', suggestion: 'Use repository', confidence: 0.9 },
                      { criterion: 'Encapsulation & Interfaces', score: 7, evidence: 'IPricingStrategy interface defined', concern: 'Fields need private modifier', suggestion: 'Add getters/setters', confidence: 0.88 },
                      { criterion: 'Abstraction & Pattern Fitness', score: 9, evidence: 'Strategy pattern justified for tariffs', concern: 'None', suggestion: 'Keep simple', confidence: 0.94 },
                      { criterion: 'Extensibility', score: 8, evidence: 'New tariffs can implement IPricingStrategy', concern: 'Adding vehicles needs factory', suggestion: 'Use vehicle factory', confidence: 0.91 },
                      { criterion: 'Edge Cases & Testability', score: 8, evidence: 'Spot reservation locks for concurrency', concern: 'Deadlock potential under load', suggestion: 'Use timeout locks', confidence: 0.89 },
                      { criterion: 'Quality of Explanation', score: 8, evidence: 'Articulated why singleton was avoided', concern: 'Brief on DB trade-offs', suggestion: 'Elaborate persistence', confidence: 0.93 },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeminiResponse,
      } as Response);

      const evaluator = new GeminiAIEvaluator('test-key-123');
      const evaluation = await evaluator.evaluate(validPayload, sampleProblem, 'attempt-101');

      expect(evaluation).toBeDefined();
      expect(evaluation.attemptId).toBe('attempt-101');
      expect(evaluation.criteria).toHaveLength(8);
      // Sum: 8+9+8+7+9+8+8+8 = 65
      expect(evaluation.totalScore).toBe(65);
      expect(evaluation.maxTotalScore).toBe(80);
      expect(evaluation.averageScore).toBe(8.1);
      expect(evaluation.overallRating).toBe('EXEMPLARY');
      expect(evaluation.summary).toBe('Solid architectural design utilizing strategy pattern for pricing.');

      // Check evidence grounding
      const reqCriterion = evaluation.getCriterion('Requirement Understanding');
      expect(reqCriterion?.evidence).toBe('Candidate identified 4 levels and diverse vehicles');
      expect(reqCriterion?.suggestion).toBe('Define explicit throughput');
    });

    it('4: Invalid or malformed Gemini JSON causes immediate error (never falls back to mock)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'NOT VALID JSON {{{ bad format' }],
              },
            },
          ],
        }),
      } as Response);

      const evaluator = new GeminiAIEvaluator('test-key-123');
      await expect(evaluator.evaluate(validPayload, sampleProblem, 'att-err-1')).rejects.toThrow(
        /Failed to parse Gemini structured JSON/
      );
    });

    it('5: Missing Gemini API key causes failure with descriptive error (no fallback)', async () => {
      const evaluator = new GeminiAIEvaluator('');
      await expect(evaluator.evaluate(validPayload, sampleProblem, 'att-err-2')).rejects.toThrow(
        /Gemini API key is not configured/
      );
    });

    it('6: Gemini timeout / network error throws error (never returns fake feedback)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Fetch timeout after 45000ms'));

      const evaluator = new GeminiAIEvaluator('test-key-123');
      await expect(evaluator.evaluate(validPayload, sampleProblem, 'att-err-3')).rejects.toThrow(
        /Fetch timeout after 45000ms/
      );
    });

    it('8: Missing criterion in Gemini response causes strict schema rejection', async () => {
      const incompleteResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Incomplete',
                    criteria: [
                      // Only 1 criterion instead of 8
                      { criterion: 'Requirement Understanding', score: 8, evidence: '...', concern: '...', suggestion: '...', confidence: 0.9 },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => incompleteResponse,
      } as Response);

      const evaluator = new GeminiAIEvaluator('test-key-123');
      await expect(evaluator.evaluate(validPayload, sampleProblem, 'att-err-4')).rejects.toThrow(
        /Gemini response must contain exactly 8 rubric criteria/
      );
    });
  });

  describe('CompositeEvaluator Pipeline', () => {
    it('fast-fails invalid submissions at Stage 1 without invoking primary evaluator', async () => {
      const validator = new DeterministicValidator();
      const mockEvaluator = new MockEvaluator();
      const evaluateSpy = vi.spyOn(mockEvaluator, 'evaluate');
      const pipeline = new CompositeEvaluator(validator, mockEvaluator);

      const badPayload = new StructuredTextPayload({
        requirementsUnderstanding: 'Too short',
        assumptionsAndConstraints: '',
        classesAndEntities: '',
        responsibilities: '',
        relationshipsAndInterfaces: '',
        patternsAndTradeoffs: '',
        edgeCasesAndReasoning: '',
      });

      await expect(pipeline.evaluate(badPayload, sampleProblem, 'att-fail')).rejects.toThrow(
        ValidationError
      );
      expect(evaluateSpy).not.toHaveBeenCalled();
    });

    it('9: CompositeEvaluator does not fabricate results on primary evaluator failure', async () => {
      const validator = new DeterministicValidator();
      const failingEvaluator = new MockEvaluator({ shouldFail: true, failureMessage: 'Network partition' });
      const pipeline = new CompositeEvaluator(validator, failingEvaluator);

      await expect(pipeline.evaluate(validPayload, sampleProblem, 'att-fail-2')).rejects.toThrow(
        'Network partition'
      );
    });
  });
});
