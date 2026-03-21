import { HttpException } from '@nestjs/common';

/**
 * 모든 커스텀 예외의 최상위 클래스.
 * errorCode를 포함하여 프론트엔드 연동 및 로그 검색에 사용.
 */
export abstract class CustomException extends HttpException {
  readonly errorCode: string;

  constructor(errorCode: string, statusCode: number, message: string) {
    super(message, statusCode);
    this.errorCode = errorCode;
  }
}
