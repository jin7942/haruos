import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CustomException } from '../exceptions/custom.exception';
import { TechnicalException } from '../exceptions/technical.exception';
import type { ApiResponse } from '@haruos/shared-types';

/**
 * 전역 예외 필터.
 * 모든 예외를 ApiResponse 형식으로 변환하여 일관된 에러 응답을 보장한다.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let errorCode: string;
    let message: string;

    if (exception instanceof CustomException) {
      statusCode = exception.getStatus();
      errorCode = exception.errorCode;
      message = exception.message;

      if (exception instanceof TechnicalException) {
        this.logger.error(`[${errorCode}] ${message}`, (exception as Error).stack);
        message = 'Internal server error';
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorCode = 'HTTP_ERROR';
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message as string || exception.message;
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'UNKNOWN_ERROR';
      message = 'Internal server error';
      this.logger.error('Unhandled exception', (exception as Error)?.stack);
    }

    const body: ApiResponse<null> = {
      success: false,
      code: errorCode,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }
}
