import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextManagerService } from './context-manager.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

describe('ContextManagerService', () => {
  let service: ContextManagerService;
  let conversationRepo: jest.Mocked<Repository<Conversation>>;
  let messageRepo: jest.Mocked<Repository<Message>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextManagerService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ContextManagerService);
    conversationRepo = module.get(getRepositoryToken(Conversation));
    messageRepo = module.get(getRepositoryToken(Message));
  });

  describe('getOrCreateConversation', () => {
    it('conversationId가 있으면 기존 대화를 반환한다', async () => {
      const existing = { id: 'conv-1', userId: 'user-1', title: '기존 대화' } as Conversation;
      conversationRepo.findOne.mockResolvedValue(existing);

      const result = await service.getOrCreateConversation('user-1', 'conv-1');

      expect(result.id).toBe('conv-1');
      expect(conversationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'conv-1', userId: 'user-1' },
      });
    });

    it('존재하지 않는 conversationId이면 ResourceNotFoundException을 던진다', async () => {
      conversationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getOrCreateConversation('user-1', 'invalid-id'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('conversationId가 없으면 새 대화를 생성한다', async () => {
      const newConv = { id: 'conv-new', userId: 'user-1', title: '새 대화' } as Conversation;
      conversationRepo.create.mockReturnValue(newConv);
      conversationRepo.save.mockResolvedValue(newConv);

      const result = await service.getOrCreateConversation('user-1');

      expect(result.id).toBe('conv-new');
      expect(conversationRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: '새 대화',
      });
    });
  });

  describe('addMessage', () => {
    it('메시지를 생성하고 저장한다', async () => {
      const msg = { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: '안녕' } as Message;
      messageRepo.create.mockReturnValue(msg);
      messageRepo.save.mockResolvedValue(msg);

      const result = await service.addMessage('conv-1', 'user', '안녕');

      expect(result.id).toBe('msg-1');
      expect(messageRepo.create).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        role: 'user',
        content: '안녕',
        metadata: null,
        tokenCount: expect.any(Number),
      });
    });

    it('메타데이터를 포함하여 저장할 수 있다', async () => {
      const metadata = { agent: 'schedule' };
      const msg = { id: 'msg-2', conversationId: 'conv-1', role: 'assistant', content: '응답', metadata, tokenCount: 1 } as unknown as Message;
      messageRepo.create.mockReturnValue(msg);
      messageRepo.save.mockResolvedValue(msg);

      await service.addMessage('conv-1', 'assistant', '응답', metadata);

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata }),
      );
    });
  });

  describe('getRecentMessages', () => {
    it('최근 메시지를 오래된 순으로 반환한다', async () => {
      const messages = [
        { id: 'msg-1', content: '첫 번째' } as Message,
        { id: 'msg-2', content: '두 번째' } as Message,
      ];
      messageRepo.find.mockResolvedValue(messages);

      const result = await service.getRecentMessages('conv-1');

      expect(result).toHaveLength(2);
      expect(messageRepo.find).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
        order: { createdAt: 'ASC' },
        take: 20,
      });
    });
  });

  describe('getConversations', () => {
    it('사용자의 대화 목록을 최신순으로 반환한다', async () => {
      const conversations = [{ id: 'conv-1' }] as Conversation[];
      conversationRepo.find.mockResolvedValue(conversations);

      const result = await service.getConversations('user-1');

      expect(result).toHaveLength(1);
      expect(conversationRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { updatedAt: 'DESC' },
      });
    });
  });

  describe('getMessages', () => {
    it('대화 소유자가 맞으면 메시지를 반환한다', async () => {
      conversationRepo.findOne.mockResolvedValue({ id: 'conv-1', userId: 'user-1' } as Conversation);
      messageRepo.find.mockResolvedValue([{ id: 'msg-1' } as Message]);

      const result = await service.getMessages('conv-1', 'user-1');

      expect(result).toHaveLength(1);
    });

    it('대화가 존재하지 않으면 ResourceNotFoundException을 던진다', async () => {
      conversationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getMessages('invalid', 'user-1'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
