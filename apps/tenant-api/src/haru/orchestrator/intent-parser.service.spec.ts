import { Test, TestingModule } from '@nestjs/testing';
import { IntentParserService } from './intent-parser.service';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { IntentResultDto } from '../../core/ai-gateway/dto/ai-chat.response.dto';

describe('IntentParserService', () => {
  let service: IntentParserService;
  let aiGateway: jest.Mocked<AiGatewayService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentParserService,
        {
          provide: AiGatewayService,
          useValue: {
            extractIntent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(IntentParserService);
    aiGateway = module.get(AiGatewayService);
  });

  describe('parseIntent', () => {
    it('schedule 인텐트를 schedule 에이전트에 매핑한다', async () => {
      aiGateway.extractIntent.mockResolvedValue(
        IntentResultDto.from('schedule', 0.95, { date: '내일' }),
      );

      const result = await service.parseIntent('내일 회의 잡아줘', []);

      expect(result.intent).toBe('schedule');
      expect(result.agent).toBe('schedule');
      expect(result.confidence).toBe(0.95);
      expect(result.entities).toEqual({ date: '내일' });
    });

    it('project 인텐트를 project 에이전트에 매핑한다', async () => {
      aiGateway.extractIntent.mockResolvedValue(
        IntentResultDto.from('project', 0.9, { name: '신규 프로젝트' }),
      );

      const result = await service.parseIntent('프로젝트 만들어줘', []);

      expect(result.agent).toBe('project');
    });

    it('알 수 없는 인텐트는 general 에이전트에 매핑한다', async () => {
      aiGateway.extractIntent.mockResolvedValue(
        IntentResultDto.from('unknown_intent', 0.3, {}),
      );

      const result = await service.parseIntent('아무 말', []);

      expect(result.agent).toBe('general');
    });

    it('document, knowledge, file 인텐트를 각각의 에이전트에 매핑한다', async () => {
      for (const intent of ['document', 'knowledge', 'file']) {
        aiGateway.extractIntent.mockResolvedValue(
          IntentResultDto.from(intent, 0.85, {}),
        );

        const result = await service.parseIntent('테스트', []);
        expect(result.agent).toBe(intent);
      }
    });
  });
});
