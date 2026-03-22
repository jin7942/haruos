import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

/** 사용자 요약 정보. 여러 응답 DTO에서 재사용. */
export class UserSummaryVo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  role: string;

  /** @param user - UserEntity에서 변환 */
  static from(user: UserEntity): UserSummaryVo {
    const vo = new UserSummaryVo();
    vo.id = user.id;
    vo.email = user.email;
    vo.name = user.name;
    vo.role = user.role;
    return vo;
  }
}

/** 회원가입 응답. */
export class SignupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;

  /** @param user - UserEntity에서 변환 */
  static from(user: UserEntity): SignupResponseDto {
    const dto = new SignupResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.createdAt = user.createdAt;
    return dto;
  }
}

/** 로그인 응답. Access Token + Refresh Token + 사용자 요약. */
export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserSummaryVo })
  user: UserSummaryVo;
}

/** 토큰 갱신 응답. 새 Access Token만 반환. */
export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;
}
