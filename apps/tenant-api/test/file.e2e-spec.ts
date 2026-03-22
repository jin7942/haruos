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
import { FileModule } from '../src/agents/file/file.module';
import { StoragePort } from '../src/core/storage/ports/storage.port';
import { File } from '../src/agents/file/entities/file.entity';
import { getTestDbConfig } from './test-db.config';

const JWT_SECRET = 'e2e-test-secret';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440004';

/** S3 스토리지 mock. 메모리에 파일을 저장한다. */
class MockStorageAdapter extends StoragePort {
  private store = new Map<string, Buffer>();

  async upload(key: string, body: Buffer, _contentType: string): Promise<void> {
    this.store.set(key, body);
  }

  async download(key: string): Promise<Buffer> {
    const data = this.store.get(key);
    if (!data) throw new Error(`File not found: ${key}`);
    return data;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getPresignedUrl(key: string): Promise<string> {
    return `https://mock-s3.example.com/${key}?signed=true`;
  }
}

describe('File Agent (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(getTestDbConfig([File])),
        JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
        FileModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    })
      .overrideProvider(StoragePort)
      .useClass(MockStorageAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const jwtService = moduleFixture.get(JwtService);
    accessToken = jwtService.sign({ sub: TEST_USER_ID, email: 'file@example.com', tenantId: 'tenant-001' });
  }, 15000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /agents/files/upload', () => {
    it('파일 업로드 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/agents/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('Hello World'), 'test.txt')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.originalName).toBe('test.txt');
      expect(res.body.data.mimeType).toBeDefined();
      expect(res.body.data.id).toBeDefined();
    });

    it('파일 없이 업로드 시 400', async () => {
      await request(app.getHttpServer())
        .post('/agents/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('GET /agents/files', () => {
    it('파일 목록 조회', async () => {
      const res = await request(app.getHttpServer())
        .get('/agents/files')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /agents/files/:id/url', () => {
    it('파일 다운로드 URL 조회', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/agents/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('URL test content'), 'url-test.txt')
        .expect(201);

      const fileId = uploadRes.body.data.id;

      const res = await request(app.getHttpServer())
        .get(`/agents/files/${fileId}/url`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toContain('mock-s3.example.com');
    });

    it('존재하지 않는 파일 URL 조회 시 404', async () => {
      await request(app.getHttpServer())
        .get('/agents/files/00000000-0000-0000-0000-000000000000/url')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('DELETE /agents/files/:id', () => {
    it('파일 삭제 성공', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/agents/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('Delete test'), 'delete-me.txt')
        .expect(201);

      const fileId = uploadRes.body.data.id;

      await request(app.getHttpServer())
        .delete(`/agents/files/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/agents/files/${fileId}/url`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('존재하지 않는 파일 삭제 시 404', async () => {
      await request(app.getHttpServer())
        .delete('/agents/files/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('파일 CRUD 통합', () => {
    it('업로드 -> 목록 -> URL 조회 -> 삭제', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/agents/files/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('Integration test content'), 'integration.txt')
        .expect(201);

      const fileId = uploadRes.body.data.id;

      const listRes = await request(app.getHttpServer())
        .get('/agents/files')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listRes.body.data.some((f: { id: string }) => f.id === fileId)).toBe(true);

      const urlRes = await request(app.getHttpServer())
        .get(`/agents/files/${fileId}/url`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(urlRes.body.data.url).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/agents/files/${fileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const listAfterRes = await request(app.getHttpServer())
        .get('/agents/files')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listAfterRes.body.data.some((f: { id: string }) => f.id === fileId)).toBe(false);
    });
  });
});
