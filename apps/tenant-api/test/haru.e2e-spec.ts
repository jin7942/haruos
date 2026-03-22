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
import { HaruModule } from '../src/haru/haru.module';
import { AiModelPort } from '../src/core/ai-gateway/ports/ai-model.port';
import { AiChatResponseDto, IntentResultDto } from '../src/core/ai-gateway/dto/ai-chat.response.dto';
import { ChatMessageDto } from '../src/core/ai-gateway/dto/ai-chat.request.dto';
import { Conversation } from '../src/haru/context/entities/conversation.entity';
import { Message } from '../src/haru/context/entities/message.entity';
import { BatchJob } from '../src/haru/batch/entities/batch-job.entity';
import { getTestDbConfig } from './test-db.config';

const JWT_SECRET = 'e2e-test-secret';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

/** AI 모델 mock. 고정 응답을 반환한다. */
class MockAiModel extends AiModelPort {
  async chat(messages: ChatMessageDto[]): Promise<AiChatResponseDto> {
    return AiChatResponseDto.from('Mock AI response', 'mock-model', 10, 20);
  }

  async summarize(text: string): Promise<string> {
    return 'Mock summary of: ' + text.substring(0, 30);
  }

  async extractIntent(message: string): Promise<IntentResultDto> {
    return IntentResultDto.from('general', 0.95, {});
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return [0.1, 0.2, 0.3];
  }
}

describe('Haru (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(getTestDbConfig([Conversation, Message, BatchJob])),
        JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
        HaruModule,
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

    jwtService = moduleFixture.get(JwtService);
    accessToken = jwtService.sign({ sub: TEST_USER_ID, email: 'test@example.com', tenantId: 'tenant-001' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /haru/chat', () => {
    it('새 대화 생성 및 AI 응답 반환', async () => {
      const res = await request(app.getHttpServer())
        .post('/haru/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '안녕하세요' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.response).toBe('Mock AI response');
      expect(res.body.data.agent).toBeDefined();
      expect(res.body.data.conversationId).toBeDefined();
    });

    it('기존 대화에 메시지 추가', async () => {
      const firstRes = await request(app.getHttpServer())
        .post('/haru/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '일정 관련 질문' })
        .expect(201);

      const conversationId = firstRes.body.data.conversationId;

      const secondRes = await request(app.getHttpServer())
        .post('/haru/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '추가 질문입니다', conversationId })
        .expect(201);

      expect(secondRes.body.data.conversationId).toBe(conversationId);
    });

    it('인증 없이 요청 시 401', async () => {
      await request(app.getHttpServer())
        .post('/haru/chat')
        .send({ message: '테스트' })
        .expect(401);
    });
  });

  describe('GET /haru/conversations', () => {
    it('대화 목록 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/haru/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /haru/conversations/:id/messages', () => {
    it('대화 메시지 목록 조회', async () => {
      const chatRes = await request(app.getHttpServer())
        .post('/haru/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '메시지 조회 테스트' })
        .expect(201);

      const conversationId = chatRes.body.data.conversationId;

      const msgRes = await request(app.getHttpServer())
        .get(`/haru/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(msgRes.body.success).toBe(true);
      expect(Array.isArray(msgRes.body.data)).toBe(true);
      expect(msgRes.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('존재하지 않는 대화 ID로 조회 시 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/haru/conversations/00000000-0000-0000-0000-000000000000/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('대화 흐름 통합', () => {
    it('대화 생성 -> 메시지 전송 -> 대화 목록 -> 메시지 조회', async () => {
      const chatRes = await request(app.getHttpServer())
        .post('/haru/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '통합 테스트 메시지' })
        .expect(201);

      const conversationId = chatRes.body.data.conversationId;

      await request(app.getHttpServer())
        .post('/haru/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '두 번째 메시지', conversationId })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get('/haru/conversations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const found = listRes.body.data.find((c: { id: string }) => c.id === conversationId);
      expect(found).toBeDefined();

      const msgRes = await request(app.getHttpServer())
        .get(`/haru/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(msgRes.body.data.length).toBeGreaterThanOrEqual(4);
    });
  });
});
