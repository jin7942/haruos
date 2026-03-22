import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { TenantUserEntity } from './entities/tenant-user.entity';
import { OtpEntity } from './entities/otp.entity';
import { OtpSenderPort } from './ports/otp-sender.port';
import {
  ResourceNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../../common/exceptions/business.exception';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<TenantUserEntity>>;
  let otpRepo: jest.Mocked<Repository<OtpEntity>>;
  let jwtService: jest.Mocked<JwtService>;
  let otpSender: jest.Mocked<OtpSenderPort>;

  const mockUser: Partial<TenantUserEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@tenant.com',
    name: '테넌트유저',
    role: 'MEMBER',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2026-03-22'),
    updatedAt: new Date('2026-03-22'),
    recordLogin: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(TenantUserEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OtpEntity),
          useValue: {
            findOne: jest.fn(),
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
          provide: OtpSenderPort,
          useValue: {
            sendOtp: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(TenantUserEntity));
    otpRepo = module.get(getRepositoryToken(OtpEntity));
    jwtService = module.get(JwtService);
    otpSender = module.get(OtpSenderPort);
  });

  describe('requestOtp', () => {
    it('등록된 사용자에게 OTP를 발송한다', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as TenantUserEntity);
      otpRepo.create.mockReturnValue({} as OtpEntity);
      otpRepo.save.mockResolvedValue({} as OtpEntity);

      const result = await service.requestOtp('user@tenant.com');

      expect(result.expiresAt).toBeDefined();
      expect(otpRepo.save).toHaveBeenCalled();
      expect(otpSender.sendOtp).toHaveBeenCalledWith(
        'user@tenant.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('등록되지 않은 이메일이면 ResourceNotFoundException을 던진다', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.requestOtp('unknown@tenant.com')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('비활성 사용자이면 ValidationException을 던진다', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as TenantUserEntity);

      await expect(service.requestOtp('user@tenant.com')).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('verifyOtp', () => {
    it('유효한 OTP로 로그인 토큰을 발급한다', async () => {
      const mockOtp = {
        userId: mockUser.id,
        code: '123456',
        usedAt: null,
        expiresAt: new Date(Date.now() + 300000),
        isExpired: () => false,
        markUsed: jest.fn(),
      } as unknown as OtpEntity;

      userRepo.findOne.mockResolvedValue(mockUser as TenantUserEntity);
      otpRepo.findOne.mockResolvedValue(mockOtp);
      userRepo.save.mockResolvedValue(mockUser as TenantUserEntity);
      otpRepo.save.mockResolvedValue(mockOtp);

      const result = await service.verifyOtp('user@tenant.com', '123456');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('user@tenant.com');
      expect(mockOtp.markUsed).toHaveBeenCalled();
    });

    it('존재하지 않는 OTP이면 UnauthorizedException을 던진다', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as TenantUserEntity);
      otpRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyOtp('user@tenant.com', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('만료된 OTP이면 UnauthorizedException을 던진다', async () => {
      const expiredOtp = {
        userId: mockUser.id,
        code: '123456',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        isExpired: () => true,
        markUsed: jest.fn(),
      } as unknown as OtpEntity;

      userRepo.findOne.mockResolvedValue(mockUser as TenantUserEntity);
      otpRepo.findOne.mockResolvedValue(expiredOtp);

      await expect(service.verifyOtp('user@tenant.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('유효한 refresh token으로 새 access token을 발급한다', async () => {
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      } as any);
      userRepo.findOne.mockResolvedValue(mockUser as TenantUserEntity);

      const result = await service.refreshAccessToken('valid-refresh-token');

      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('유효하지 않은 refresh token이면 UnauthorizedException을 던진다', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('에러 없이 완료된다', async () => {
      await expect(service.logout()).resolves.toBeUndefined();
    });
  });
});
