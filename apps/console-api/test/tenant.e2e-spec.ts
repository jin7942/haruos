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
import { TenantModule } from 'src/modules/tenant/tenant.module';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';
import { DataSource } from 'typeorm';
import { testDbConfig } from './test-db.config';

const JWT_SECRET = 'test-secret';

describe('Tenant E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dataSource: DataSource;
  let accessToken: string;
  const userId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(testDbConfig([TenantEntity])),
        JwtModule.register({
          global: true,
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
        TenantModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    dataSource = moduleFixture.get(DataSource);
    accessToken = jwtService.sign({ sub: userId, email: 'test@example.com' });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  let tenantId: string;

  describe('POST /api/tenants', () => {
    it('테넌트 생성 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'My Project',
          slug: 'my-project',
          description: 'Test tenant',
          region: 'ap-northeast-2',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('My Project');
      expect(res.body.data.slug).toBe('my-project');
      expect(res.body.data.status).toBe('CREATING');
      expect(res.body.data.plan).toBe('STARTER');
      expect(res.body.data.region).toBe('ap-northeast-2');
      expect(res.body.data.id).toBeDefined();

      tenantId = res.body.data.id;
    });

    it('slug 중복 시 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Duplicate',
          slug: 'my-project',
          description: 'Dup',
          region: 'ap-northeast-2',
        })
        .expect(409);

      expect(res.body.code).toBe('DUPLICATE_RESOURCE');
    });

    it('인증 없이 접근하면 401', async () => {
      await request(app.getHttpServer())
        .post('/api/tenants')
        .send({ name: 'No Auth', slug: 'no-auth', description: 'x', region: 'us-east-1' })
        .expect(401);
    });
  });

  describe('GET /api/tenants', () => {
    it('내 테넌트 목록 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].slug).toBe('my-project');
    });

    it('다른 사용자의 테넌트는 조회되지 않는다', async () => {
      const otherToken = jwtService.sign({ sub: 'other-user-id', email: 'other@test.com' });

      const res = await request(app.getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/tenants/:id', () => {
    it('테넌트 상세 조회', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(tenantId);
      expect(res.body.data.name).toBe('My Project');
    });

    it('다른 사용자가 조회하면 404', async () => {
      const otherToken = jwtService.sign({ sub: 'other-user-id', email: 'other@test.com' });

      await request(app.getHttpServer())
        .get(`/api/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('존재하지 않는 테넌트 조회 시 404', async () => {
      await request(app.getHttpServer())
        .get('/api/tenants/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/tenants/:id', () => {
    it('테넌트 이름/설명 수정', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name', description: 'Updated description' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.description).toBe('Updated description');
    });
  });

  describe('POST /api/tenants/:id/suspend & resume', () => {
    it('CREATING 상태에서 suspend 시도하면 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tenants/${tenantId}/suspend`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);

      expect(res.body.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('ACTIVE 상태로 전환 후 suspend/resume 성공', async () => {
      // DB에서 직접 상태를 ACTIVE로 변경 (프로비저닝 완료 시뮬레이션)
      await dataSource.getRepository(TenantEntity).update(tenantId, { status: 'ACTIVE' });

      // suspend
      const suspendRes = await request(app.getHttpServer())
        .post(`/api/tenants/${tenantId}/suspend`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(suspendRes.body.data.status).toBe('SUSPENDED');

      // resume
      const resumeRes = await request(app.getHttpServer())
        .post(`/api/tenants/${tenantId}/resume`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(resumeRes.body.data.status).toBe('ACTIVE');
    });

    it('ACTIVE 상태에서 resume 시도하면 409', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenants/${tenantId}/resume`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });
  });

  describe('DELETE /api/tenants/:id', () => {
    it('테넌트 삭제 (soft delete)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 삭제 후 조회 시 404
      await request(app.getHttpServer())
        .get(`/api/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('삭제 후 목록에서도 제외', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });
});
