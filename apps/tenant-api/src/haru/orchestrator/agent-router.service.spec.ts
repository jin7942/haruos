import { Test, TestingModule } from '@nestjs/testing';
import { AgentRouterService } from './agent-router.service';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { AiChatResponseDto } from '../../core/ai-gateway/dto/ai-chat.response.dto';
import { ParsedIntent } from './intent-parser.service';

describe('AgentRouterService', () => {
  let service: AgentRouterService;
  let aiGateway: jest.Mocked<AiGatewayService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRouterService,
        {
          provide: AiGatewayService,
          useValue: {
            chat: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AgentRouterService);
    aiGateway = module.get(AiGatewayService);
  });

  describe('route', () => {
    const mockAiResponse = AiChatResponseDto.from('AI 응답', 'claude-3-sonnet', 10, 5);

    it('schedule 에이전트 라우팅 시 AI 응답을 반환한다', async () => {
      aiGateway.chat.mockResolvedValue(mockAiResponse);

      const intent: ParsedIntent = {
        intent: 'schedule', agent: 'schedule', entities: {}, confidence: 0.9,
      };

      const result = await service.route(intent, '회의 잡아줘', []);

      expect(result.response).toBe('AI 응답');
      expect(result.agent).toBe('schedule');
      expect(result.actions).toEqual([]);
    });

    it('general 에이전트 라우팅 시 기본 시스템 프롬프트를 사용한다', async () => {
      aiGateway.chat.mockResolvedValue(mockAiResponse);

      const intent: ParsedIntent = {
        intent: 'general', agent: 'general', entities: {}, confidence: 0.5,
      };

      const result = await service.route(intent, '안녕', []);

      expect(result.response).toBe('AI 응답');
      expect(result.agent).toBe('general');
      // 시스템 프롬프트가 포함된 메시지 목록으로 호출되었는지 확인
      expect(aiGateway.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: '안녕' }),
        ]),
      );
    });

    it('대화 맥락을 AI 호출에 포함한다', async () => {
      aiGateway.chat.mockResolvedValue(mockAiResponse);

      const context = [
        { role: 'user' as const, content: '이전 메시지' },
        { role: 'assistant' as const, content: '이전 응답' },
      ];
      const intent: ParsedIntent = {
        intent: 'project', agent: 'project', entities: {}, confidence: 0.8,
      };

      await service.route(intent, '새 메시지', context);

      expect(aiGateway.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ content: '이전 메시지' }),
          expect.objectContaining({ content: '이전 응답' }),
        ]),
      );
    });
  });
});
