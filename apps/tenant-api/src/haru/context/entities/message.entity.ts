import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Conversation } from './conversation.entity';

/**
 * 메시지 엔티티.
 * 대화 내 개별 메시지를 저장한다.
 */
@Entity('messages')
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column()
  role: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'token_count', type: 'int', default: 0 })
  tokenCount: number;
}
