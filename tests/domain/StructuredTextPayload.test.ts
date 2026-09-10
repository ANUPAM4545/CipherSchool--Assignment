import { describe, it, expect } from 'vitest';
import { StructuredTextPayload, StructuredTextData } from '../../src/domain/payloads/StructuredTextPayload';

describe('StructuredTextPayload', () => {
  const validData: StructuredTextData = {
    requirementsUnderstanding: 'The parking lot must support multiple vehicle types and track slot occupancy dynamically.',
    assumptionsAndConstraints: 'Assuming single entry and exit points, in-memory persistence for MVP, and concurrency handling for slot allocation.',
    classesAndEntities: 'Vehicle (Car, Bike, Truck), ParkingSpot, ParkingFloor, ParkingLot, Ticket, Payment.',
    responsibilities: 'ParkingLot manages floors, ParkingFloor manages spots, Ticket tracks entry time and spot assigned.',
    relationshipsAndInterfaces: 'IPricingStrategy implemented by HourlyPricingStrategy and FlatPricingStrategy; Vehicle has ParkingSpot.',
    patternsAndTradeoffs: 'Strategy pattern for pricing to allow runtime algorithm switching; Factory pattern for vehicle creation.',
    edgeCasesAndReasoning: 'Thread safety during spot allocation using locks; Handling full parking lot with graceful rejection.',
  };

  it('validates a complete and substantial payload successfully', () => {
    const payload = new StructuredTextPayload(validData);
    const result = payload.validateStructure();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing required sections', () => {
    const invalidData: StructuredTextData = {
      ...validData,
      requirementsUnderstanding: '',
      responsibilities: '   ',
    };
    const payload = new StructuredTextPayload(invalidData);
    const result = payload.validateStructure();

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Requirements Understanding'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Responsibilities'))).toBe(true);
  });

  it('detects sections that are too short to be meaningful (< 20 chars)', () => {
    const shortData: StructuredTextData = {
      ...validData,
      patternsAndTradeoffs: 'Used factory.', // only 13 chars
    };
    const payload = new StructuredTextPayload(shortData);
    const result = payload.validateStructure();

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Patterns and Trade-offs'))).toBe(true);
  });

  it('generates markdown evaluation context containing all sections', () => {
    const payload = new StructuredTextPayload(validData);
    const context = payload.toEvaluationContext();

    expect(context).toContain('### 1. Requirements Understanding');
    expect(context).toContain('### 2. Assumptions & Constraints');
    expect(context).toContain('### 3. Classes & Entities');
    expect(context).toContain('### 4. Class Responsibilities');
    expect(context).toContain('### 5. Relationships & Interfaces');
    expect(context).toContain('### 6. Design Patterns & Architectural Trade-offs');
    expect(context).toContain('### 7. Edge Cases & Concurrency / Testability Reasoning');
    expect(context).toContain('The parking lot must support multiple vehicle types');
  });

  it('calculates deterministic SHA-256 hash', () => {
    const payload1 = new StructuredTextPayload(validData);
    const payload2 = new StructuredTextPayload({ ...validData });
    const payload3 = new StructuredTextPayload({ ...validData, requirementsUnderstanding: 'Different text content' });

    expect(payload1.calculateHash()).toBe(payload2.calculateHash());
    expect(payload1.calculateHash()).not.toBe(payload3.calculateHash());
  });

  it('serializes and deserializes correctly via fromJSON', () => {
    const payload = new StructuredTextPayload(validData);
    const serialized = payload.serialize();
    const revived = StructuredTextPayload.fromJSON(serialized);

    expect(revived.format).toBe(StructuredTextPayload.FORMAT);
    expect(revived.data.requirementsUnderstanding).toBe(validData.requirementsUnderstanding);
    expect(revived.calculateHash()).toBe(payload.calculateHash());
  });

  it('calculates total word count accurately', () => {
    const payload = new StructuredTextPayload(validData);
    expect(payload.getTotalWordCount()).toBeGreaterThan(50);
  });
});
