import { HttpStatus } from '@nestjs/common';
import { CustomException } from './custom.exception';

/** 4xx — 사용자가 해결 가능한 예외 */
export abstract class BusinessException extends CustomException {}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id: string) {
    super('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, `${resource} not found: ${id}`);
  }
}

export class DuplicateResourceException extends BusinessException {
  constructor(resource: string, field: string) {
    super('DUPLICATE_RESOURCE', HttpStatus.CONFLICT, `${resource} already exists: ${field}`);
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string) {
    super('VALIDATION_ERROR', HttpStatus.BAD_REQUEST, message);
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', HttpStatus.UNAUTHORIZED, message);
  }
}

export class InvalidStateTransitionException extends BusinessException {
  constructor(currentState: string, targetState: string) {
    super(
      'INVALID_STATE_TRANSITION',
      HttpStatus.CONFLICT,
      `Cannot transition from ${currentState} to ${targetState}`,
    );
  }
}
