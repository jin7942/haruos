import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpRequestDto } from './dto/request-otp.request.dto';
import { VerifyOtpRequestDto } from './dto/verify-otp.request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { OtpResponseDto, LoginResponseDto, TokenResponseDto } from './dto/auth.response.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * OTP 발송 요청. 등록된 이메일로 6자리 코드를 발송한다.
   *
   * @param dto - 이메일 주소
   * @returns OTP 만료 시각
   */
  @Public()
  @Post('otp/request')
  @ApiOperation({ summary: 'OTP 발송 요청' })
  @ApiResponse({ status: 201, type: OtpResponseDto })
  requestOtp(@Body() dto: RequestOtpRequestDto): Promise<OtpResponseDto> {
    return this.authService.requestOtp(dto.email);
  }

  /**
   * OTP 검증 및 로그인. 유효한 OTP 입력 시 JWT 토큰을 발급한다.
   *
   * @param dto - 이메일, OTP 코드
   * @returns Access Token, Refresh Token, 사용자 정보
   */
  @Public()
  @Post('otp/verify')
  @ApiOperation({ summary: 'OTP 검증 및 로그인' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  verifyOtp(@Body() dto: VerifyOtpRequestDto): Promise<LoginResponseDto> {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  /**
   * Access Token 갱신.
   *
   * @param dto - Refresh Token
   * @returns 새 Access Token
   */
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  refresh(@Body() dto: RefreshTokenRequestDto): Promise<TokenResponseDto> {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  /**
   * 로그아웃.
   */
  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 201 })
  logout(): Promise<void> {
    return this.authService.logout();
  }
}
