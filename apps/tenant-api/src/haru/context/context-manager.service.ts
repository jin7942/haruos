import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/** 대화 맥락에서 가져올 최근 메시지 기본 개수 */
const DEFAULT_MESSAGE_LIMIT = 20;

/** AI 모델 컨텍스트 윈도우 토큰 제한 (안전 마진 포함). */
const MAX_CONTEXT_TOKENS = 8000;

/** 자동 아카이브 대상: 마지막 메시지 이후 경과 일수. */
const AUTO_ARCHIVE_DAYS = 30;

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
   * 대화의 맥락을 토큰 제한에 맞게 축약한다.
   * 가장 오래된 메시지부터 제거하여 토큰 합이 MAX_CONTEXT_TOKENS 이하가 되도록 한다.
   * system 역할 메시지는 항상 유지한다.
   *
   * @param conversationId - 대화 ID
   * @returns 토큰 제한에 맞게 필터링된 메시지 목록
   */
  async getContextWithinTokenLimit(conversationId: string): Promise<Message[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    let totalTokens = systemMessages.reduce((sum, m) => sum + m.tokenCount, 0);
    const result: Message[] = [];

    // 최신 메시지부터 역순으로 추가
    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const msg = nonSystemMessages[i];
      if (totalTokens + msg.tokenCount > MAX_CONTEXT_TOKENS) {
        break;
      }
      totalTokens += msg.tokenCount;
      result.unshift(msg);
    }

    return [...systemMessages, ...result];
  }

  /**
   * 대화 내용을 요약 텍스트로 생성한다.
   * 최근 메시지를 기반으로 대화 제목과 요약을 반환한다.
   *
   * @param conversationId - 대화 ID
   * @returns 대화 요약 (주요 토픽, 메시지 수, 총 토큰 수)
   */
  async summarizeConversation(conversationId: string): Promise<{
    messageCount: number;
    totalTokens: number;
    firstMessage: string | null;
    lastMessage: string | null;
  }> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    const totalTokens = messages.reduce((sum, m) => sum + m.tokenCount, 0);
    const userMessages = messages.filter((m) => m.role === 'user');

    return {
      messageCount: messages.length,
      totalTokens,
      firstMessage: userMessages[0]?.content?.slice(0, 200) ?? null,
      lastMessage: userMessages.length > 0
        ? userMessages[userMessages.length - 1].content.slice(0, 200)
        : null,
    };
  }

  /**
   * 오래된 대화를 자동 아카이브한다.
   * 마지막 메시지 이후 AUTO_ARCHIVE_DAYS 이상 경과한 대화의 제목에 [아카이브] 접두사를 추가한다.
   *
   * @param userId - 사용자 ID
   * @returns 아카이브된 대화 수
   */
  async autoArchive(userId: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_ARCHIVE_DAYS);

    const staleConversations = await this.conversationRepository.find({
      where: {
        userId,
        updatedAt: LessThan(cutoffDate),
      },
    });

    // 이미 아카이브된 대화는 제외
    const toArchive = staleConversations.filter(
      (c) => !c.title?.startsWith('[아카이브]'),
    );

    for (const conversation of toArchive) {
      conversation.updateTitle(`[아카이브] ${conversation.title ?? '제목 없음'}`);
    }

    if (toArchive.length > 0) {
      await this.conversationRepository.save(toArchive);
      this.logger.log(`Auto-archived ${toArchive.length} conversations for user: ${userId}`);
    }

    return toArchive.length;
  }

  /**
   * 대화의 총 토큰 수를 계산한다.
   *
   * @param conversationId - 대화 ID
   * @returns 총 토큰 수
   */
  async getTotalTokenCount(conversationId: string): Promise<number> {
    const result = await this.messageRepository
      .createQueryBuilder('message')
      .select('SUM(message.tokenCount)', 'total')
      .where('message.conversationId = :conversationId', { conversationId })
      .getRawOne();
    return Number(result?.total ?? 0);
  }

  /**
   * 토큰 수 추정. 실제 토크나이저 대신 간이 계산.
   * 한국어 1자 ~ 2토큰, 영어 1단어 ~ 1.3토큰 기준.
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 2);
  }
}
