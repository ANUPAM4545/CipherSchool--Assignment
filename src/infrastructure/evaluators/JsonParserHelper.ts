/**
 * Resilient JSON extraction and parser for LLM structured outputs.
 *
 * Handles common LLM output anomalies:
 * 1. Markdown code fences (```json ... ```)
 * 2. Trailing commentary, explanations, or unescaped braces outside the root JSON object
 * 3. Trailing commas before closing braces/brackets
 * 4. Trailing whitespace or newlines
 */
export function extractAndParseJsonObject<T>(rawText: string): T {
  let cleaned = (rawText || '').trim();

  // Strip leading markdown fence if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').trim();
  }

  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in response (missing opening brace "{")');
  }

  // Balanced-brace root object extractor:
  // Tracks string literals (and escapes) so braces inside strings do not alter depth.
  let extracted = cleaned;
  let depth = 0;
  let inString = false;
  let escape = false;
  let foundBalancedObject = false;

  for (let i = firstBrace; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          extracted = cleaned.substring(firstBrace, i + 1);
          foundBalancedObject = true;
          break;
        }
      }
    }
  }

  // Attempt 1: Parse balanced root object
  try {
    return JSON.parse(extracted) as T;
  } catch (primaryError) {
    // Attempt 2: Clean trailing commas (e.g. `[1, 2, ]` or `{"a": 1, }`)
    try {
      const noTrailingCommas = extracted.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(noTrailingCommas) as T;
    } catch {
      // Attempt 3: If depth parsing didn't find balanced object, try lastIndexOf('}')
      if (!foundBalancedObject) {
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace > firstBrace) {
          const fallback = cleaned.substring(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(fallback) as T;
          } catch {
            try {
              const fallbackNoCommas = fallback.replace(/,\s*([}\]])/g, '$1');
              return JSON.parse(fallbackNoCommas) as T;
            } catch {
              // Fall through to rethrow primary error
            }
          }
        }
      }

      throw new Error(
        `Failed to parse Gemini structured JSON output: ${
          primaryError instanceof Error ? primaryError.message : String(primaryError)
        }`
      );
    }
  }
}
