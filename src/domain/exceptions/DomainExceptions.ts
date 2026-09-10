export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(fromState: string, toState: string, reason?: string) {
    super(
      `Invalid state transition from '${fromState}' to '${toState}'${reason ? `: ${reason}` : ''}`
    );
  }
}

export class ValidationError extends DomainError {
  constructor(public readonly errors: string[]) {
    super(`Validation failed: ${errors.join('; ')}`);
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id '${id}' was not found`);
  }
}
