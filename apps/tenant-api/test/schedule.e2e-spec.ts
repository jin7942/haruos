import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';
import { ScheduleModule } from '../src/agents/schedule/schedule.module';
import { ClickUpApiPort } from '../src/core/clickup/ports/clickup-api.port';
import { ClickUpTaskResponseDto } from '../src/core/clickup/dto/clickup-task.response.dto';
import { CreateClickUpTaskRequestDto } from '../src/core/clickup/dto/create-clickup-task.request.dto';
import { Schedule } from '../src/agents/schedule/entities/schedule.entity';
import { getTestDbConfig } from './test-db.config';

const JWT_SECRET = 'e2e-test-secret';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440003';

/** ClickUp API mock */
class MockClickUpApi extends ClickUpApiPort {
  async getTasks(): Promise<ClickUpTaskResponseDto[]> {
    return [];
  }

  async createTask(dto: CreateClickUpTaskRequestDto): Promise<ClickUpTaskResponseDto> {
    const task = new ClickUpTaskResponseDto();
    task.id = 'clickup-task-001';
    task.name = dto.name;
    task.status = 'open';
    task.url = 'https://app.clickup.com/t/clickup-task-001';
    return task;
  }

  async updateTask(taskId: string, data: Partial<CreateClickUpTaskRequestDto>): Promise<ClickUpTaskResponseDto> {
    const task = new ClickUpTaskResponseDto();
    task.id = taskId;
    task.name = data.name ?? 'Updated';
    task.status = 'open';
    task.url = `https://app.clickup.com/t/${taskId}`;
    return task;
  }

  async getSpaces() {
    return [];
  }

  async getLists() {
    return [];
  }
}

describe('Schedule Agent (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(getTestDbConfig([Schedule])),
        JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
        ScheduleModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    })
      .overrideProvider(ClickUpApiPort)
      .useClass(MockClickUpApi)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const jwtService = moduleFixture.get(JwtService);
    accessToken = jwtService.sign({ sub: TEST_USER_ID, email: 'schedule@example.com', tenantId: 'tenant-001' });
  }, 15000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /agents/schedules', () => {
    it('일정 생성 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '팀 회의',
          description: '주간 팀 미팅',
          startAt: '2026-04-01T10:00:00Z',
          endAt: '2026-04-01T11:00:00Z',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('팀 회의');
      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.id).toBeDefined();
    });

    it('필수 필드 누락 시 400', async () => {
      await request(app.getHttpServer())
        .post('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: '제목 없음' })
        .expect(400);
    });
  });

  describe('GET /agents/schedules', () => {
    it('일정 목록 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /agents/schedules/:id', () => {
    it('일정 제목 수정', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '수정 전 일정', startAt: '2026-04-02T09:00:00Z' })
        .expect(201);

      const scheduleId = createRes.body.data.id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/agents/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '수정 후 일정' })
        .expect(200);

      expect(updateRes.body.data.title).toBe('수정 후 일정');
    });

    it('존재하지 않는 일정 수정 시 404', async () => {
      await request(app.getHttpServer())
        .patch('/agents/schedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '없는 일정' })
        .expect(404);
    });
  });

  describe('DELETE /agents/schedules/:id', () => {
    it('일정 취소 성공', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '취소할 일정', startAt: '2026-04-03T14:00:00Z' })
        .expect(201);

      const scheduleId = createRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/agents/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('존재하지 않는 일정 취소 시 404', async () => {
      await request(app.getHttpServer())
        .delete('/agents/schedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('이미 취소된 일정 재취소 시 409', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '이중 취소 테스트', startAt: '2026-04-04T10:00:00Z' })
        .expect(201);

      const scheduleId = createRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/agents/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/agents/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });
  });

  describe('일정 CRUD 통합', () => {
    it('생성 -> 목록 조회 -> 수정 -> 취소', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '통합 테스트 일정', startAt: '2026-04-05T09:00:00Z', endAt: '2026-04-05T10:00:00Z' })
        .expect(201);

      const scheduleId = createRes.body.data.id;

      const listRes = await request(app.getHttpServer())
        .get('/agents/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listRes.body.data.some((s: { id: string }) => s.id === scheduleId)).toBe(true);

      const updateRes = await request(app.getHttpServer())
        .patch(`/agents/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '수정된 통합 테스트 일정' })
        .expect(200);

      expect(updateRes.body.data.title).toBe('수정된 통합 테스트 일정');

      await request(app.getHttpServer())
        .delete(`/agents/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
