import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { ContextManagerService } from '../context/context-manager.service';
import { IntentParserService, ParsedIntent } from './intent-parser.service';
import { AgentRouterService, AgentResponse } from './agent-router.service';
import { Conversation } from '../context/entities/conversation.entity';
import { Message } from '../context/entities/message.entity';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let contextManager: jest.Mocked<ContextManagerService>;
  let intentParser: jest.Mocked<IntentParserService>;
  let agentRouter: jest.Mocked<AgentRouterService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        {
          provide: ContextManagerService,
          useValue: {
            getOrCreateConversation: jest.fn(),
            addMessage: jest.fn(),
            getRecentMessages: jest.fn(),
          },
        },
        {
          provide: IntentParserService,
          useValue: {
            parseIntent: jest.fn(),
          },
        },
        {
          provide: AgentRouterService,
          useValue: {
            route: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OrchestratorService);
    contextManager = module.get(ContextManagerService);
    intentParser = module.get(IntentParserService);
    agentRouter = module.get(AgentRouterService);
  });

  describe('processMessage', () => {
    it('메시지를 처리하고 AI 응답을 반환한다', async () => {
      const conversation = { id: 'conv-1', userId: 'user-1' } as Conversation;
      const userMessage = { id: 'msg-1', role: 'user', content: '회의 잡아줘' } as Message;
      const intent: ParsedIntent = {
        intent: 'schedule',
        agent: 'schedule',
        entities: { date: '내일' },
        confidence: 0.95,
      };
      const agentResponse: AgentResponse = {
        response: '내일 회의를 생성했습니다.',
        agent: 'schedule',
        actions: [],
      };

      contextManager.getOrCreateConversation.mockResolvedValue(conversation);
      contextManager.addMessage.mockResolvedValue(userMessage);
      contextManager.getRecentMessages.mockResolvedValue([userMessage]);
      intentParser.parseIntent.mockResolvedValue(intent);
      agentRouter.route.mockResolvedValue(agentResponse);

      const result = await service.processMessage('user-1', {
        message: '회의 잡아줘',
      });

      expect(result.response).toBe('내일 회의를 생성했습니다.');
      expect(result.agent).toBe('schedule');
      expect(result.conversationId).toBe('conv-1');
    });

    it('기존 대화 ID가 있으면 해당 대화를 사용한다', async () => {
      const conversation = { id: 'conv-existing' } as Conversation;
      contextManager.getOrCreateConversation.mockResolvedValue(conversation);
      contextManager.addMessage.mockResolvedValue({} as Message);
      contextManager.getRecentMessages.mockResolvedValue([]);
      intentParser.parseIntent.mockResolvedValue({
        intent: 'general', agent: 'general', entities: {}, confidence: 0.8,
      });
      agentRouter.route.mockResolvedValue({
        response: '안녕하세요', agent: 'general', actions: [],
      });

      await service.processMessage('user-1', {
        message: '안녕',
        conversationId: 'conv-existing',
      });

      expect(contextManager.getOrCreateConversation).toHaveBeenCalledWith(
        'user-1',
        'conv-existing',
      );
    });

    it('AI 응답을 assistant 메시지로 저장한다', async () => {
      contextManager.getOrCreateConversation.mockResolvedValue({ id: 'conv-1' } as Conversation);
      contextManager.addMessage.mockResolvedValue({} as Message);
      contextManager.getRecentMessages.mockResolvedValue([]);
      intentParser.parseIntent.mockResolvedValue({
        intent: 'general', agent: 'general', entities: {}, confidence: 0.9,
      });
      agentRouter.route.mockResolvedValue({
        response: 'AI 응답', agent: 'general', actions: [],
      });

      await service.processMessage('user-1', { message: '테스트' });

      // addMessage가 2번 호출 (user 메시지, assistant 메시지)
      expect(contextManager.addMessage).toHaveBeenCalledTimes(2);
      expect(contextManager.addMessage).toHaveBeenLastCalledWith(
        'conv-1',
        'assistant',
        'AI 응답',
        expect.objectContaining({ agent: 'general' }),
      );
    });
  });
});
