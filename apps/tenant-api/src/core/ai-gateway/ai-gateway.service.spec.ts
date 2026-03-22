import { Test, TestingModule } from '@nestjs/testing';
import { AiGatewayService } from './ai-gateway.service';
import { AiModelPort } from './ports/ai-model.port';
import { AiChatResponseDto, IntentResultDto } from './dto/ai-chat.response.dto';

describe('AiGatewayService', () => {
  let service: AiGatewayService;
  let aiModel: jest.Mocked<AiModelPort>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGatewayService,
        {
          provide: AiModelPort,
          useValue: {
            chat: jest.fn(),
            summarize: jest.fn(),
            extractIntent: jest.fn(),
            generateEmbedding: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiGatewayService>(AiGatewayService);
    aiModel = module.get(AiModelPort);
  });

  describe('chat', () => {
    it('AiModelPort.chat을 호출하고 결과를 반환한다', async () => {
      const mockResponse = AiChatResponseDto.from('응답', 'claude-3-sonnet', 10, 5);
      aiModel.chat.mockResolvedValue(mockResponse);

      const result = await service.chat([{ role: 'user', content: '안녕' }]);

      expect(result.content).toBe('응답');
      expect(result.model).toBe('claude-3-sonnet');
      expect(aiModel.chat).toHaveBeenCalledWith(
        [{ role: 'user', content: '안녕' }],
        undefined,
      );
    });
  });

  describe('summarize', () => {
    it('AiModelPort.summarize를 호출하고 결과를 반환한다', async () => {
      aiModel.summarize.mockResolvedValue('요약 결과');

      const result = await service.summarize('긴 텍스트');

      expect(result).toBe('요약 결과');
    });
  });

  describe('extractIntent', () => {
    it('AiModelPort.extractIntent를 호출하고 결과를 반환한다', async () => {
      const mockIntent = IntentResultDto.from('schedule', 0.95, { date: '내일' });
      aiModel.extractIntent.mockResolvedValue(mockIntent);

      const result = await service.extractIntent('내일 회의 잡아줘');

      expect(result.intent).toBe('schedule');
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('generateEmbedding', () => {
    it('AiModelPort.generateEmbedding을 호출하고 벡터를 반환한다', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      aiModel.generateEmbedding.mockResolvedValue(mockEmbedding);

      const result = await service.generateEmbedding('테스트 텍스트');

      expect(result).toEqual([0.1, 0.2, 0.3]);
    });
  });
});
