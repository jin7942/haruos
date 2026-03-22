import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { ApiResponseInterceptor } from 'src/common/interceptors/api-response.interceptor';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MailSenderPort } from 'src/modules/auth/ports/mail-sender.port';
import { UserEntity } from 'src/modules/auth/entities/user.entity';
import { EmailVerificationEntity } from 'src/modules/auth/entities/email-verification.entity';
import { RefreshTokenEntity } from 'src/modules/auth/entities/refresh-token.entity';
import { testDbConfig } from './test-db.config';

/** MailSenderPort mock. 발송된 토큰을 캡처하여 테스트에서 사용. */
class MockMailSender extends MailSenderPort {
  lastToken: string | null = null;

  async sendVerificationEmail(_email: string, token: string): Promise<void> {
    this.lastToken = token;
  }
}

describe('Auth E2E', () => {
  let app: INestApplication;
  let mockMailSender: MockMailSender;

  beforeAll(async () => {
    mockMailSender = new MockMailSender();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(
          testDbConfig([UserEntity, EmailVerificationEntity, RefreshTokenEntity]),
        ),
        JwtModule.register({
          global: true,
          secret: 'test-secret',
          signOptions: { expiresIn: '15m' },
        }),
        AuthModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    })
      .overrideProvider(MailSenderPort)
      .useValue(mockMailSender)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  let accessToken: string;
  let refreshToken: string;

  describe('POST /api/auth/signup', () => {
    it('회원가입 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.name).toBe(testUser.name);
      expect(res.body.data.id).toBeDefined();
      expect(mockMailSender.lastToken).toBeDefined();
    });

    it('이메일 중복 시 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(testUser)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('DUPLICATE_RESOURCE');
    });

    it('유효하지 않은 이메일 형식이면 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ email: 'invalid', password: 'password123', name: 'Test' })
        .expect(400);
    });

    it('비밀번호가 8자 미만이면 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ email: 'short@test.com', password: 'short', name: 'Test' })
        .expect(400);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('유효한 토큰으로 이메일 인증 성공', async () => {
      const token = mockMailSender.lastToken!;

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token })
        .expect(201);
    });

    it('이미 인증된 토큰이면 400', async () => {
      const token = mockMailSender.lastToken!;

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('존재하지 않는 토큰이면 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: 'nonexistent-token' })
        .expect(404);

      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('POST /api/auth/login', () => {
    it('로그인 성공 시 토큰 발급', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('잘못된 비밀번호면 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('존재하지 않는 이메일이면 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('유효한 refresh token으로 새 access token 발급', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('유효하지 않은 refresh token이면 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('인증 없이 접근하면 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .send({ oldPassword: testUser.password, newPassword: 'newpassword123' })
        .expect(401);
    });

    it('비밀번호 변경 성공', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: testUser.password, newPassword: 'newpassword123' })
        .expect(201);
    });

    it('변경된 비밀번호로 로그인 가능', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'newpassword123' })
        .expect(201);

      expect(res.body.data.accessToken).toBeDefined();
      accessToken = res.body.data.accessToken;
    });

    it('기존 비밀번호가 틀리면 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: 'wrongpassword', newPassword: 'another123' })
        .expect(401);
    });
  });
});
