import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';
import { AuthModule } from '../src/core/auth/auth.module';
import { OtpSenderPort } from '../src/core/auth/ports/otp-sender.port';
import { TenantUserEntity } from '../src/core/auth/entities/tenant-user.entity';
import { OtpEntity } from '../src/core/auth/entities/otp.entity';
import { getTestDbConfig } from './test-db.config';

/** OTP 발송을 가로채는 mock 어댑터. 발송된 코드를 기록한다. */
class MockOtpSender extends OtpSenderPort {
  lastCode: string | null = null;
  lastEmail: string | null = null;

  async sendOtp(email: string, code: string): Promise<void> {
    this.lastEmail = email;
    this.lastCode = code;
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mockOtpSender: MockOtpSender;

  const TEST_EMAIL = 'test@tenant.example.com';
  const TEST_USER_NAME = 'Test User';
  const TEST_TENANT_ID = 'tenant-001';
  const JWT_SECRET = 'e2e-test-secret';

  beforeAll(async () => {
    mockOtpSender = new MockOtpSender();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET, JWT_ACCESS_EXPIRY: '15m' })],
        }),
        TypeOrmModule.forRoot(getTestDbConfig([TenantUserEntity, OtpEntity])),
        JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
        AuthModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    })
      .overrideProvider(OtpSenderPort)
      .useValue(mockOtpSender)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    // 테스트 사용자 시드
    const userRepo = moduleFixture.get('TenantUserEntityRepository');
    const user = userRepo.create({
      email: TEST_EMAIL,
      name: TEST_USER_NAME,
      tenantId: TEST_TENANT_ID,
      isActive: true,
    });
    await userRepo.save(user);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/otp/request', () => {
    it('등록된 이메일로 OTP 요청 시 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: TEST_EMAIL })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.expiresAt).toBeDefined();
      expect(mockOtpSender.lastEmail).toBe(TEST_EMAIL);
      expect(mockOtpSender.lastCode).toHaveLength(6);
    });

    it('등록되지 않은 이메일로 OTP 요청 시 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: 'unknown@example.com' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('잘못된 이메일 형식으로 요청 시 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('유효한 OTP로 검증 시 토큰 발급', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: TEST_EMAIL })
        .expect(201);

      const code = mockOtpSender.lastCode!;

      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ email: TEST_EMAIL, code })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
      expect(res.body.data.user.name).toBe(TEST_USER_NAME);
    });

    it('잘못된 OTP 코드로 검증 시 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ email: TEST_EMAIL, code: '000000' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /auth/logout', () => {
    it('인증된 사용자의 로그아웃 성공', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: TEST_EMAIL });

      const code = mockOtpSender.lastCode!;
      const loginRes = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ email: TEST_EMAIL, code });

      const token = loginRes.body.data.accessToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    });

    it('토큰 없이 로그아웃 시 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('인증 흐름 통합', () => {
    it('OTP 요청 -> 검증 -> 토큰으로 보호된 엔드포인트 접근', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: TEST_EMAIL })
        .expect(201);

      const verifyRes = await request(app.getHttpServer())
        .post('/auth/otp/verify')
        .send({ email: TEST_EMAIL, code: mockOtpSender.lastCode! })
        .expect(201);

      const token = verifyRes.body.data.accessToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    });
  });
});
