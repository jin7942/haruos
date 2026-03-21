import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse } from '@haruos/shared-types';

/**
 * Controller 반환값을 ApiResponse 형식으로 자동 래핑한다.
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        code: 'OK',
        message: 'Success',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
