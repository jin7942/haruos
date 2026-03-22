import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { ApiResponseInterceptor } from 'src/common/interceptors/api-response.interceptor';
import { BillingModule } from 'src/modules/billing/billing.module';
import { PaymentPort } from 'src/modules/billing/ports/payment.port';
import { SubscriptionEntity } from 'src/modules/billing/entities/subscription.entity';
import { DataSource } from 'typeorm';
import { testDbConfig } from './test-db.config';

const JWT_SECRET = 'test-secret';

/** PaymentPort mock. 외부 결제 시스템 연동 없이 테스트. */
class MockPaymentPort extends PaymentPort {
  async createCustomer(_email: string, _name: string): Promise<string> {
    return `cus_mock_${Date.now()}`;
  }

  async createSubscription(_customerId: string, _priceId: string): Promise<string> {
    return `sub_mock_${Date.now()}`;
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // no-op
  }

  async getSubscription(_subscriptionId: string): Promise<{ status: string; currentPeriodEnd: Date }> {
    return { status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
  }
}

describe('Billing E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dataSource: DataSource;
  let accessToken: string;
  const tenantId = '00000000-0000-0000-0000-000000000010';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(testDbConfig([SubscriptionEntity])),
        JwtModule.register({
          global: true,
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
        BillingModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    })
      .overrideProvider(PaymentPort)
      .useClass(MockPaymentPort)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    dataSource = moduleFixture.get(DataSource);
    accessToken = jwtService.sign({ sub: 'test-user', email: 'test@test.com' });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/billing/subscriptions', () => {
    it('구독 생성 성공 (TRIAL 상태)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/billing/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tenantId,
          email: 'billing@test.com',
          name: 'Test User',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tenantId).toBe(tenantId);
      expect(res.body.data.status).toBe('TRIAL');
      expect(res.body.data.id).toBeDefined();
    });

    it('같은 테넌트에 구독 중복 생성 시 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/billing/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tenantId,
          email: 'billing@test.com',
          name: 'Test User',
        })
        .expect(409);

      expect(res.body.code).toBe('DUPLICATE_RESOURCE');
    });

    it('인증 없이 접근하면 401', async () => {
      await request(app.getHttpServer())
        .post('/api/billing/subscriptions')
        .send({
          tenantId: 'another-tenant',
          email: 'x@x.com',
          name: 'X',
        })
        .expect(401);
    });
  });

  describe('GET /api/billing/subscriptions/:tenantId', () => {
    it('구독 조회 성공', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/billing/subscriptions/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tenantId).toBe(tenantId);
      expect(res.body.data.status).toBe('TRIAL');
    });

    it('구독 없는 테넌트 조회 시 404', async () => {
      await request(app.getHttpServer())
        .get('/api/billing/subscriptions/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/billing/subscriptions/:tenantId', () => {
    it('TRIAL 상태에서 취소 시 409 (ACTIVE/PAST_DUE만 취소 가능)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/billing/subscriptions/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('ACTIVE 상태로 전환 후 구독 취소 성공', async () => {
      // DB에서 직접 ACTIVE로 변경 (결제 활성화 시뮬레이션)
      await dataSource.getRepository(SubscriptionEntity).update(
        { tenantId },
        { status: 'ACTIVE' as const },
      );

      const res = await request(app.getHttpServer())
        .delete(`/api/billing/subscriptions/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.cancelledAt).toBeDefined();
    });

    it('이미 취소된 구독 재취소 시 409', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/billing/subscriptions/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.code).toBe('INVALID_STATE_TRANSITION');
    });
  });
});
