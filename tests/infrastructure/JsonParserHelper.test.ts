import { describe, it, expect } from 'vitest';
import { extractAndParseJsonObject } from '../../src/infrastructure/evaluators/JsonParserHelper';

describe('JsonParserHelper (Resilient LLM Output Parser)', () => {
  it('parses standard clean JSON', () => {
    const raw = JSON.stringify({ summary: 'Great design', score: 9 });
    const result = extractAndParseJsonObject<{ summary: string; score: number }>(raw);
    expect(result.summary).toBe('Great design');
    expect(result.score).toBe(9);
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const raw = "```json\n" + JSON.stringify({ summary: 'Markdown block' }) + "\n```";
    const result = extractAndParseJsonObject<{ summary: string }>(raw);
    expect(result.summary).toBe('Markdown block');
  });

  it('CRITICAL: parses JSON when LLM adds trailing commentary containing closing braces (fixes position 4949 error)', () => {
    const validJson = JSON.stringify({ summary: 'Valid object', details: [1, 2, 3] });
    const problematicLlmOutput = `${validJson}\n\nAdditional notes from evaluator: { "extra": "notes" }\nHope this helps!}`;

    const result = extractAndParseJsonObject<{ summary: string; details: number[] }>(problematicLlmOutput);
    expect(result.summary).toBe('Valid object');
    expect(result.details).toEqual([1, 2, 3]);
  });

  it('handles strings containing curly braces without premature extraction truncation', () => {
    const complexJson = JSON.stringify({
      summary: 'Code with braces',
      evidence: 'function foo() { return { a: 1 }; }',
      criteria: [{ name: 'Logic', notes: 'Checked { edge: true }' }]
    });

    const result = extractAndParseJsonObject<any>(complexJson);
    expect(result.evidence).toBe('function foo() { return { a: 1 }; }');
    expect(result.criteria[0].notes).toBe('Checked { edge: true }');
  });

  it('handles escaped quotes inside strings', () => {
    const escapedJson = '{"summary": "Candidate said: \\"We used Strategy pattern\\"", "score": 10}';
    const result = extractAndParseJsonObject<any>(escapedJson);
    expect(result.summary).toBe('Candidate said: "We used Strategy pattern"');
  });

  it('repairs trailing commas before closing braces/brackets', () => {
    const jsonWithTrailingCommas = `{
      "summary": "Trailing comma test",
      "items": [1, 2, 3, ],
      "nested": { "a": 1, },
    }`;

    const result = extractAndParseJsonObject<any>(jsonWithTrailingCommas);
    expect(result.summary).toBe('Trailing comma test');
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.nested.a).toBe(1);
  });

  it('throws a descriptive error when no JSON object opening brace is found', () => {
    expect(() => extractAndParseJsonObject('Just plain text without any json')).toThrow(
      /No JSON object found in response/
    );
  });
});
