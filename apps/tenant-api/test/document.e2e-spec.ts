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
import { DocumentModule } from '../src/agents/document/document.module';
import { AiModelPort } from '../src/core/ai-gateway/ports/ai-model.port';
import { AiChatResponseDto, IntentResultDto } from '../src/core/ai-gateway/dto/ai-chat.response.dto';
import { ChatMessageDto } from '../src/core/ai-gateway/dto/ai-chat.request.dto';
import { Document } from '../src/agents/document/entities/document.entity';
import { getTestDbConfig } from './test-db.config';

const JWT_SECRET = 'e2e-test-secret';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

/** AI 모델 mock */
class MockAiModel extends AiModelPort {
  async chat(messages: ChatMessageDto[]): Promise<AiChatResponseDto> {
    return AiChatResponseDto.from(
      '- Action Item 1\n- Action Item 2\n- Action Item 3',
      'mock-model', 10, 20,
    );
  }

  async summarize(text: string): Promise<string> {
    return 'Mock summary: ' + text.substring(0, 30);
  }

  async extractIntent(message: string): Promise<IntentResultDto> {
    return IntentResultDto.from('document', 0.9, {});
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return [0.1, 0.2, 0.3];
  }
}

describe('Document Agent (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(getTestDbConfig([Document])),
        JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
        DocumentModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    })
      .overrideProvider(AiModelPort)
      .useClass(MockAiModel)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const jwtService = moduleFixture.get(JwtService);
    accessToken = jwtService.sign({ sub: TEST_USER_ID, email: 'doc@example.com', tenantId: 'tenant-001' });
  }, 15000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /agents/documents', () => {
    it('문서 생성 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '회의록', content: '# 회의 내용\n\n- 항목1\n- 항목2', type: 'MEETING_NOTE' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('회의록');
      expect(res.body.data.type).toBe('MEETING_NOTE');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.id).toBeDefined();
    });

    it('content 없이 문서 생성 가능', async () => {
      const res = await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '빈 문서', type: 'SUMMARY' })
        .expect(201);

      expect(res.body.data.content).toBeNull();
    });

    it('잘못된 type으로 생성 시 400', async () => {
      await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '잘못된 타입', type: 'INVALID_TYPE' })
        .expect(400);
    });
  });

  describe('GET /agents/documents', () => {
    it('문서 목록 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('type 필터로 문서 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/agents/documents?type=MEETING_NOTE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.every((d: { type: string }) => d.type === 'MEETING_NOTE')).toBe(true);
    });
  });

  describe('PATCH /agents/documents/:id', () => {
    it('문서 제목 수정', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '수정 전', content: '내용', type: 'MEETING_NOTE' })
        .expect(201);

      const docId = createRes.body.data.id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/agents/documents/${docId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '수정 후' })
        .expect(200);

      expect(updateRes.body.data.title).toBe('수정 후');
    });

    it('존재하지 않는 문서 수정 시 404', async () => {
      await request(app.getHttpServer())
        .patch('/agents/documents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '없는 문서' })
        .expect(404);
    });
  });

  describe('POST /agents/documents/:id/summarize', () => {
    it('문서 AI 요약 성공', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '요약 테스트', content: '요약할 내용이 있는 문서입니다.', type: 'MEETING_NOTE' })
        .expect(201);

      const docId = createRes.body.data.id;

      const res = await request(app.getHttpServer())
        .post(`/agents/documents/${docId}/summarize`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toContain('Mock summary');
    });

    it('content 없는 문서 요약 시 400', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '빈 문서2', type: 'SUMMARY' })
        .expect(201);

      const docId = createRes.body.data.id;

      await request(app.getHttpServer())
        .post(`/agents/documents/${docId}/summarize`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('POST /agents/documents/:id/action-items', () => {
    it('Action Item 추출 성공', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'AI 추출 테스트', content: '회의 결과 여러 항목이 정해졌습니다.', type: 'MEETING_NOTE' })
        .expect(201);

      const docId = createRes.body.data.id;

      const res = await request(app.getHttpServer())
        .post(`/agents/documents/${docId}/action-items`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.actionItems)).toBe(true);
      expect(res.body.data.actionItems.length).toBeGreaterThan(0);
    });
  });

  describe('문서 CRUD 통합', () => {
    it('생성 -> 목록 조회 -> 수정 -> AI 요약', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '통합 테스트 문서', content: '통합 테스트용 문서 내용입니다.', type: 'MEETING_NOTE' })
        .expect(201);

      const docId = createRes.body.data.id;

      const listRes = await request(app.getHttpServer())
        .get('/agents/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listRes.body.data.some((d: { id: string }) => d.id === docId)).toBe(true);

      await request(app.getHttpServer())
        .patch(`/agents/documents/${docId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '수정된 통합 테스트 문서' })
        .expect(200);

      const summaryRes = await request(app.getHttpServer())
        .post(`/agents/documents/${docId}/summarize`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(summaryRes.body.data.summary).toBeDefined();
    });
  });
});
