import { describe, it, expect } from 'vitest';
import { AttemptStateMachine } from '../../src/domain/state-machine/AttemptStateMachine';
import { InvalidStateTransitionError } from '../../src/domain/exceptions/DomainExceptions';

describe('AttemptStateMachine', () => {
  it('initializes in DRAFT state by default', () => {
    const fsm = new AttemptStateMachine();
    expect(fsm.currentState).toBe('DRAFT');
    expect(fsm.history).toHaveLength(0);
  });

  it('can initialize in a custom state', () => {
    const fsm = new AttemptStateMachine('SUBMITTED');
    expect(fsm.currentState).toBe('SUBMITTED');
  });

  describe('Valid Transitions', () => {
    it('transitions DRAFT -> SUBMITTED -> EVALUATING -> COMPLETED', () => {
      const fsm = new AttemptStateMachine();

      fsm.transitionTo('SUBMITTED', 'Learner clicked submit');
      expect(fsm.currentState).toBe('SUBMITTED');

      fsm.transitionTo('EVALUATING', 'Worker picked up attempt');
      expect(fsm.currentState).toBe('EVALUATING');

      fsm.transitionTo('COMPLETED', 'Evaluation finished');
      expect(fsm.currentState).toBe('COMPLETED');

      expect(fsm.history).toHaveLength(3);
      expect(fsm.history[0].fromState).toBe('DRAFT');
      expect(fsm.history[0].toState).toBe('SUBMITTED');
      expect(fsm.history[1].fromState).toBe('SUBMITTED');
      expect(fsm.history[1].toState).toBe('EVALUATING');
      expect(fsm.history[2].fromState).toBe('EVALUATING');
      expect(fsm.history[2].toState).toBe('COMPLETED');
    });

    it('transitions EVALUATING -> FAILED -> EVALUATING -> COMPLETED (Retry Evaluation flow)', () => {
      const fsm = new AttemptStateMachine('EVALUATING');

      fsm.transitionTo('FAILED', 'LLM timeout');
      expect(fsm.currentState).toBe('FAILED');

      fsm.transitionTo('EVALUATING', 'Learner clicked retry evaluation');
      expect(fsm.currentState).toBe('EVALUATING');

      fsm.transitionTo('COMPLETED', 'Evaluation successful on retry');
      expect(fsm.currentState).toBe('COMPLETED');
    });
  });

  describe('Invalid Transitions Rejection', () => {
    it('rejects DRAFT -> EVALUATING directly', () => {
      const fsm = new AttemptStateMachine('DRAFT');
      expect(() => fsm.transitionTo('EVALUATING')).toThrow(InvalidStateTransitionError);
    });

    it('rejects DRAFT -> COMPLETED directly', () => {
      const fsm = new AttemptStateMachine('DRAFT');
      expect(() => fsm.transitionTo('COMPLETED')).toThrow(InvalidStateTransitionError);
    });

    it('rejects SUBMITTED -> COMPLETED without EVALUATING stage', () => {
      const fsm = new AttemptStateMachine('SUBMITTED');
      expect(() => fsm.transitionTo('COMPLETED')).toThrow(InvalidStateTransitionError);
    });

    it('rejects transitions out of COMPLETED terminal state', () => {
      const fsm = new AttemptStateMachine('COMPLETED');
      expect(() => fsm.transitionTo('EVALUATING')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transitionTo('SUBMITTED')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transitionTo('FAILED')).toThrow(InvalidStateTransitionError);
    });

    it('rejects FAILED -> COMPLETED directly without re-entering EVALUATING', () => {
      const fsm = new AttemptStateMachine('FAILED');
      expect(() => fsm.transitionTo('COMPLETED')).toThrow(InvalidStateTransitionError);
    });
  });
});
