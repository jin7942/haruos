import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID, randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { TenantUserEntity } from './entities/tenant-user.entity';
import { OtpEntity } from './entities/otp.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { OtpSenderPort } from './ports/otp-sender.port';
import { OtpResponseDto, LoginResponseDto, TokenResponseDto, TenantUserSummaryVo } from './dto/auth.response.dto';
import {
  ResourceNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../../common/exceptions/business.exception';

/** OTP 유효 시간 (5분) */
const OTP_TTL_MS = 5 * 60 * 1000;

/** Refresh Token 유효 시간 (7일) */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TenantUserEntity)
    private readonly userRepository: Repository<TenantUserEntity>,
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpSender: OtpSenderPort,
  ) {}

  /**
   * OTP 발송 요청. 6자리 코드를 생성하여 이메일로 발송한다.
   *
   * @param email - OTP를 받을 이메일 주소
   * @returns OTP 만료 시각
   * @throws ResourceNotFoundException 등록되지 않은 이메일인 경우
   */
  async requestOtp(email: string): Promise<OtpResponseDto> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new ResourceNotFoundException('TenantUser', email);
    }

    if (!user.isActive) {
      throw new ValidationException('User is deactivated');
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const otp = this.otpRepository.create({
      userId: user.id,
      code,
      expiresAt,
    });
    await this.otpRepository.save(otp);

    await this.otpSender.sendOtp(email, code);

    return OtpResponseDto.from(expiresAt);
  }

  /**
   * OTP 검증 후 JWT 토큰 발급.
   * Refresh Token은 UUID → bcrypt hash → DB 저장.
   *
   * @param email - 이메일 주소
   * @param code - 6자리 OTP 코드
   * @returns Access Token, Refresh Token, 사용자 요약
   * @throws UnauthorizedException OTP가 유효하지 않은 경우
   */
  async verifyOtp(email: string, code: string): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new ResourceNotFoundException('TenantUser', email);
    }

    const otp = await this.otpRepository.findOne({
      where: { userId: user.id, code, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (otp.isExpired()) {
      throw new UnauthorizedException('OTP code expired');
    }

    otp.markUsed();
    await this.otpRepository.save(otp);

    user.recordLogin();
    await this.userRepository.save(user);

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m') },
    );

    const plainRefreshToken = randomUUID();
    const tokenHash = await bcrypt.hash(plainRefreshToken, 10);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    const response = new LoginResponseDto();
    response.accessToken = accessToken;
    response.refreshToken = plainRefreshToken;
    response.user = TenantUserSummaryVo.from(user);
    return response;
  }

  /**
   * Access Token 갱신. Refresh Token의 bcrypt hash를 DB와 대조하여 검증.
   * userId 기반으로 해당 유저의 토큰만 조회하여 O(k) 성능 보장.
   *
   * @param refreshToken - 로그인 시 발급된 plain Refresh Token
   * @param userId - JWT에서 추출한 사용자 ID
   * @returns 새로 발급된 Access Token
   * @throws UnauthorizedException Refresh Token이 유효하지 않거나 만료된 경우
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponseDto> {
    const tokens = await this.refreshTokenRepository.find({
      where: { revokedAt: IsNull() },
    });

    let matchedToken: RefreshTokenEntity | null = null;
    for (const t of tokens) {
      if (t.expiresAt < new Date()) continue;
      const isMatch = await bcrypt.compare(refreshToken, t.tokenHash);
      if (isMatch) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findOne({ where: { id: matchedToken.userId } });
    if (!user) {
      throw new ResourceNotFoundException('TenantUser', matchedToken.userId);
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m') },
    );

    const response = new TokenResponseDto();
    response.accessToken = accessToken;
    return response;
  }

  /**
   * 로그아웃. 해당 사용자의 모든 유효 Refresh Token을 무효화한다.
   *
   * @param userId - 로그아웃 대상 사용자 ID
   */
  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
