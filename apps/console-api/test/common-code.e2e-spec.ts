import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { ApiResponseInterceptor } from 'src/common/interceptors/api-response.interceptor';
import { CommonCodeModule } from 'src/modules/common-code/common-code.module';
import { CodeGroupEntity } from 'src/modules/common-code/entities/code-group.entity';
import { CodeEntity } from 'src/modules/common-code/entities/code.entity';
import { testDbConfig } from './test-db.config';

const JWT_SECRET = 'test-secret';

/** 테스트용 인메모리 캐시. cache-manager v5 store 호환성 문제를 우회. */
class MockCacheManager {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async set(key: string, value: unknown, _ttl?: number): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async reset(): Promise<void> {
    this.store.clear();
  }
}

describe('Common Code E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(testDbConfig([CodeGroupEntity, CodeEntity])),
        JwtModule.register({
          global: true,
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
        CommonCodeModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue(new MockCacheManager())
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    accessToken = jwtService.sign({ sub: 'admin-user', email: 'admin@test.com' });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/codes/groups', () => {
    it('코드 그룹 생성 (인증 필요)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/codes/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'TENANT_STATUS',
          name: '테넌트 상태',
          description: '테넌트의 상태를 관리하는 코드 그룹',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.groupCode).toBe('TENANT_STATUS');
      expect(res.body.data.name).toBe('테넌트 상태');
    });

    it('중복 그룹 코드 시 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/codes/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'TENANT_STATUS',
          name: '중복',
        })
        .expect(409);

      expect(res.body.code).toBe('DUPLICATE_RESOURCE');
    });

    it('두 번째 코드 그룹 생성', async () => {
      await request(app.getHttpServer())
        .post('/api/codes/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'PLAN_TYPE',
          name: '플랜 타입',
        })
        .expect(201);
    });
  });

  describe('POST /api/codes', () => {
    it('코드 생성 (인증 필요)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/codes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'TENANT_STATUS',
          code: 'ACTIVE',
          name: '활성',
          sortOrder: 1,
          isEnabled: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('ACTIVE');
      expect(res.body.data.name).toBe('활성');
      expect(res.body.data.groupCode).toBe('TENANT_STATUS');
      expect(res.body.data.sortOrder).toBe(1);
      expect(res.body.data.isEnabled).toBe(true);
    });

    it('같은 그룹 내 중복 코드 시 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/codes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'TENANT_STATUS',
          code: 'ACTIVE',
          name: '중복',
        })
        .expect(409);

      expect(res.body.code).toBe('DUPLICATE_RESOURCE');
    });

    it('존재하지 않는 그룹에 코드 추가 시 404', async () => {
      await request(app.getHttpServer())
        .post('/api/codes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'NONEXISTENT',
          code: 'X',
          name: 'X',
        })
        .expect(404);
    });

    it('추가 코드 생성', async () => {
      await request(app.getHttpServer())
        .post('/api/codes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'TENANT_STATUS',
          code: 'SUSPENDED',
          name: '일시중지',
          sortOrder: 2,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/codes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          groupCode: 'TENANT_STATUS',
          code: 'CREATING',
          name: '생성중',
          sortOrder: 0,
        })
        .expect(201);
    });
  });

  describe('GET /api/codes/groups (Public)', () => {
    it('인증 없이 전체 코드 그룹 조회 가능', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/codes/groups')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/codes/groups/:groupCode (Public)', () => {
    it('그룹 코드로 하위 코드 포함 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/codes/groups/TENANT_STATUS')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.groupCode).toBe('TENANT_STATUS');
      expect(res.body.data.codes).toHaveLength(3);
      // sortOrder 순으로 정렬 확인
      expect(res.body.data.codes[0].code).toBe('CREATING');
      expect(res.body.data.codes[1].code).toBe('ACTIVE');
      expect(res.body.data.codes[2].code).toBe('SUSPENDED');
    });

    it('존재하지 않는 그룹 코드 조회 시 404', async () => {
      await request(app.getHttpServer())
        .get('/api/codes/groups/NONEXISTENT')
        .expect(404);
    });
  });
});
