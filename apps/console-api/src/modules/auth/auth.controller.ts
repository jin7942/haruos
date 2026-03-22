import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/signup.request.dto';
import { LoginRequestDto } from './dto/login.request.dto';
import { VerifyEmailRequestDto } from './dto/verify-email.request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { SignupResponseDto, LoginResponseDto, TokenResponseDto } from './dto/auth.response.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, type: SignupResponseDto })
  signup(@Body() dto: SignupRequestDto): Promise<SignupResponseDto> {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: '이메일 인증' })
  @ApiResponse({ status: 201 })
  verifyEmail(@Body() dto: VerifyEmailRequestDto): Promise<void> {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  refresh(@Body() dto: RefreshTokenRequestDto, @Req() req: Request): Promise<TokenResponseDto> {
    const authHeader = req.headers.authorization;
    const expiredAccessToken = authHeader?.replace('Bearer ', '') ?? null;
    return this.authService.refreshAccessToken(dto.refreshToken, expiredAccessToken);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({ status: 201 })
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordRequestDto): Promise<void> {
    const userId = (req as any).user.sub;
    return this.authService.changePassword(userId, dto);
  }
}
