import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

export class UserSummaryVo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  static from(user: UserEntity): UserSummaryVo {
    const vo = new UserSummaryVo();
    vo.id = user.id;
    vo.email = user.email;
    vo.name = user.name;
    return vo;
  }
}

export class SignupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;

  static from(user: UserEntity): SignupResponseDto {
    const dto = new SignupResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.createdAt = user.createdAt;
    return dto;
  }
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserSummaryVo })
  user: UserSummaryVo;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;
}
