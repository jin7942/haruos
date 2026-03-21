import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UserEntity } from './entities/user.entity';
import { EmailVerificationEntity } from './entities/email-verification.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { SignupRequestDto } from './dto/signup.request.dto';
import { LoginRequestDto } from './dto/login.request.dto';
import { ChangePasswordRequestDto } from './dto/change-password.request.dto';
import { SignupResponseDto, LoginResponseDto, TokenResponseDto, UserSummaryVo } from './dto/auth.response.dto';
import { MailSenderPort } from './ports/mail-sender.port';
import {
  DuplicateResourceException,
  ResourceNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../../common/exceptions/business.exception';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(EmailVerificationEntity)
    private readonly emailVerificationRepository: Repository<EmailVerificationEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailSender: MailSenderPort,
  ) {}

  /**
   * 회원가입.
   * 이메일 중복 검증 → 비밀번호 해싱 → 사용자 생성 → 인증 메일 발송.
   */
  async signup(dto: SignupRequestDto): Promise<SignupResponseDto> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new DuplicateResourceException('User', dto.email);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });
    await this.userRepository.save(user);

    const token = randomUUID();
    const verification = this.emailVerificationRepository.create({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await this.emailVerificationRepository.save(verification);

    await this.mailSender.sendVerificationEmail(user.email, token);

    return SignupResponseDto.from(user);
  }

  /**
   * 로그인.
   * 비밀번호 검증 → Access Token + Refresh Token 발급.
   */
  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m') },
    );

    const plainRefreshToken = randomUUID();
    const tokenHash = await bcrypt.hash(plainRefreshToken, 10);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const response = new LoginResponseDto();
    response.accessToken = accessToken;
    response.refreshToken = plainRefreshToken;
    response.user = UserSummaryVo.from(user);
    return response;
  }

  /**
   * 이메일 인증.
   * 토큰 유효성 검증 → 사용자 인증 상태 업데이트.
   */
  async verifyEmail(token: string): Promise<void> {
    const verification = await this.emailVerificationRepository.findOne({ where: { token } });
    if (!verification) {
      throw new ResourceNotFoundException('EmailVerification', token);
    }

    if (verification.verifiedAt) {
      throw new ValidationException('Email already verified');
    }

    if (verification.expiresAt < new Date()) {
      throw new ValidationException('Verification token expired');
    }

    const user = await this.userRepository.findOne({ where: { id: verification.userId } });
    if (!user) {
      throw new ResourceNotFoundException('User', verification.userId);
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    await this.userRepository.save(user);

    verification.verifiedAt = new Date();
    await this.emailVerificationRepository.save(verification);
  }

  /**
   * Access Token 갱신.
   * Refresh Token 검증 → 새 Access Token 발급.
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponseDto> {
    const tokens = await this.refreshTokenRepository.find({
      where: { revokedAt: null as any },
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
      throw new ResourceNotFoundException('User', matchedToken.userId);
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m') },
    );

    const response = new TokenResponseDto();
    response.accessToken = accessToken;
    return response;
  }

  /**
   * 비밀번호 변경.
   * 기존 비밀번호 검증 → 새 비밀번호 해싱 + 저장.
   */
  async changePassword(userId: string, dto: ChangePasswordRequestDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
  }
}
