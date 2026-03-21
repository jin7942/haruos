import { HttpStatus } from '@nestjs/common';
import { CustomException } from './custom.exception';

/** 5xx — 시스템 문제. 로깅 후 일반 메시지 반환 */
export abstract class TechnicalException extends CustomException {}

export class ExternalApiException extends TechnicalException {
  constructor(service: string, message: string) {
    super('EXTERNAL_API_ERROR', HttpStatus.BAD_GATEWAY, `External API error [${service}]: ${message}`);
  }
}

export class DatabaseException extends TechnicalException {
  constructor(message: string) {
    super('DATABASE_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, `Database error: ${message}`);
  }
}

export class InfrastructureException extends TechnicalException {
  constructor(message: string) {
    super('INFRASTRUCTURE_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, `Infrastructure error: ${message}`);
  }
}
