import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/** 대화 맥락에서 가져올 최근 메시지 기본 개수 */
const DEFAULT_MESSAGE_LIMIT = 20;

/**
 * 대화 맥락 관리 서비스.
 * 대화 생성/조회 및 메시지 저장/조회를 담당한다.
 */
@Injectable()
export class ContextManagerService {
  private readonly logger = new Logger(ContextManagerService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  /**
   * 기존 대화를 조회하거나 새 대화를 생성한다.
   *
   * @param userId - 사용자 ID
   * @param conversationId - 기존 대화 ID (없으면 새로 생성)
   * @returns 대화 엔티티
   * @throws ResourceNotFoundException 지정된 대화 ID가 존재하지 않는 경우
   */
  async getOrCreateConversation(userId: string, conversationId?: string): Promise<Conversation> {
    if (conversationId) {
      const existing = await this.conversationRepository.findOne({
        where: { id: conversationId, userId },
      });
      if (!existing) {
        throw new ResourceNotFoundException('Conversation', conversationId);
      }
      return existing;
    }

    const conversation = this.conversationRepository.create({
      userId,
      title: '새 대화',
    });
    const saved = await this.conversationRepository.save(conversation);
    this.logger.log(`New conversation created: ${saved.id} for user: ${userId}`);
    return saved;
  }

  /**
   * 대화에 메시지를 추가한다.
   *
   * @param conversationId - 대화 ID
   * @param role - 메시지 역할 (user/assistant/system)
   * @param content - 메시지 내용
   * @param metadata - 추가 메타데이터
   * @returns 저장된 메시지 엔티티
   */
  async addMessage(
    conversationId: string,
    role: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<Message> {
    const message = this.messageRepository.create({
      conversationId,
      role,
      content,
      metadata: metadata ?? null,
      tokenCount: this.estimateTokenCount(content),
    });
    return this.messageRepository.save(message);
  }

  /**
   * 대화의 최근 메시지를 조회한다.
   *
   * @param conversationId - 대화 ID
   * @param limit - 조회할 메시지 수 (기본 20)
   * @returns 최근 메시지 목록 (오래된 순)
   */
  async getRecentMessages(conversationId: string, limit = DEFAULT_MESSAGE_LIMIT): Promise<Message[]> {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * 사용자의 대화 목록을 조회한다.
   *
   * @param userId - 사용자 ID
   * @returns 대화 목록 (최신순)
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * 대화의 메시지를 조회한다 (페이징 없는 단순 조회).
   *
   * @param conversationId - 대화 ID
   * @param userId - 사용자 ID (소유권 확인)
   * @returns 메시지 목록 (오래된 순)
   * @throws ResourceNotFoundException 대화가 존재하지 않는 경우
   */
  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }

    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 토큰 수 추정. 실제 토크나이저 대신 간이 계산.
   * 한국어 1자 ~ 2토큰, 영어 1단어 ~ 1.3토큰 기준.
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 2);
  }
}
