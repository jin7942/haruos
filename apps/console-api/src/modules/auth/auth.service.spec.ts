import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { EmailVerificationEntity } from './entities/email-verification.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { MailSenderPort } from './ports/mail-sender.port';
import {
  DuplicateResourceException,
  ResourceNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../../common/exceptions/business.exception';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let emailVerifRepo: jest.Mocked<Repository<EmailVerificationEntity>>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshTokenEntity>>;
  let jwtService: jest.Mocked<JwtService>;
  let mailSender: jest.Mocked<MailSenderPort>;

  const mockUser: Partial<UserEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@test.com',
    passwordHash: '$2b$10$hashedpassword',
    name: '테스트',
    isEmailVerified: false,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date('2026-03-21'),
    updatedAt: new Date('2026-03-21'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EmailVerificationEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('15m'),
          },
        },
        {
          provide: MailSenderPort,
          useValue: {
            sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    emailVerifRepo = module.get(getRepositoryToken(EmailVerificationEntity));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));
    jwtService = module.get(JwtService);
    mailSender = module.get(MailSenderPort);
  });

  describe('signup', () => {
    it('새 사용자를 생성하고 인증 메일을 발송한다', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser as UserEntity);
      userRepo.save.mockResolvedValue(mockUser as UserEntity);
      emailVerifRepo.create.mockReturnValue({} as EmailVerificationEntity);
      emailVerifRepo.save.mockResolvedValue({} as EmailVerificationEntity);

      const result = await service.signup({
        email: 'test@test.com',
        password: '12345678',
        name: '테스트',
      });

      expect(result.email).toBe('test@test.com');
      expect(result.name).toBe('테스트');
      expect(userRepo.save).toHaveBeenCalled();
      expect(emailVerifRepo.save).toHaveBeenCalled();
      expect(mailSender.sendVerificationEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.any(String),
      );
    });

    it('이메일 중복 시 DuplicateResourceException을 던진다', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as UserEntity);

      await expect(
        service.signup({ email: 'test@test.com', password: '12345678', name: '테스트' }),
      ).rejects.toThrow(DuplicateResourceException);
    });
  });

  describe('login', () => {
    it('유효한 자격증명으로 토큰을 발급한다', async () => {
      const hashedPassword = await bcrypt.hash('12345678', 10);
      const user = { ...mockUser, passwordHash: hashedPassword } as UserEntity;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);
      refreshTokenRepo.create.mockReturnValue({} as RefreshTokenEntity);
      refreshTokenRepo.save.mockResolvedValue({} as RefreshTokenEntity);

      const result = await service.login({ email: 'test@test.com', password: '12345678' });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@test.com');
    });

    it('존재하지 않는 이메일이면 UnauthorizedException을 던진다', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: '12345678' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      const hashedPassword = await bcrypt.hash('12345678', 10);
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      } as UserEntity);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('유효한 토큰으로 이메일을 인증한다', async () => {
      const verification = {
        id: 'v-1',
        userId: mockUser.id,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000),
        verifiedAt: null,
      } as EmailVerificationEntity;

      emailVerifRepo.findOne.mockResolvedValue(verification);
      userRepo.findOne.mockResolvedValue(mockUser as UserEntity);
      userRepo.save.mockResolvedValue(mockUser as UserEntity);
      emailVerifRepo.save.mockResolvedValue(verification);

      await service.verifyEmail('valid-token');

      expect(userRepo.save).toHaveBeenCalled();
      expect(emailVerifRepo.save).toHaveBeenCalled();
    });

    it('존재하지 않는 토큰이면 ResourceNotFoundException을 던진다', async () => {
      emailVerifRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('이미 인증된 토큰이면 ValidationException을 던진다', async () => {
      emailVerifRepo.findOne.mockResolvedValue({
        verifiedAt: new Date(),
      } as EmailVerificationEntity);

      await expect(service.verifyEmail('used-token')).rejects.toThrow(ValidationException);
    });

    it('만료된 토큰이면 ValidationException을 던진다', async () => {
      emailVerifRepo.findOne.mockResolvedValue({
        verifiedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      } as EmailVerificationEntity);

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(ValidationException);
    });
  });

  describe('refreshAccessToken', () => {
    it('유효한 refresh token으로 새 access token을 발급한다', async () => {
      const plainToken = 'test-refresh-token';
      const tokenHash = await bcrypt.hash(plainToken, 10);

      refreshTokenRepo.find.mockResolvedValue([
        {
          id: 'rt-1',
          userId: mockUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 86400000),
          revokedAt: null,
        } as RefreshTokenEntity,
      ]);
      userRepo.findOne.mockResolvedValue(mockUser as UserEntity);

      const result = await service.refreshAccessToken(plainToken);

      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('유효하지 않은 refresh token이면 UnauthorizedException을 던진다', async () => {
      refreshTokenRepo.find.mockResolvedValue([]);

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('기존 비밀번호 검증 후 새 비밀번호로 변경한다', async () => {
      const hashedPassword = await bcrypt.hash('oldpassword', 10);
      const user = { ...mockUser, passwordHash: hashedPassword } as UserEntity;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await service.changePassword(mockUser.id!, {
        oldPassword: 'oldpassword',
        newPassword: 'newpassword123',
      });

      expect(userRepo.save).toHaveBeenCalled();
    });

    it('기존 비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      const hashedPassword = await bcrypt.hash('oldpassword', 10);
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      } as UserEntity);

      await expect(
        service.changePassword(mockUser.id!, {
          oldPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('존재하지 않는 사용자면 ResourceNotFoundException을 던진다', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', {
          oldPassword: 'old',
          newPassword: 'new12345',
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
