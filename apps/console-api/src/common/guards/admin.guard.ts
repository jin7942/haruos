import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '../exceptions/business.exception';

/**
 * 관리자 전용 가드.
 * JWT 페이로드의 role이 'ADMIN'인 경우에만 접근을 허용한다.
 * JwtAuthGuard 이후에 적용되어야 한다.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedException('Admin access required');
    }

    return true;
  }
}
