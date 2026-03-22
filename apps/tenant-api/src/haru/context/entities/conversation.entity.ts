import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Message } from './message.entity';

/**
 * 대화 엔티티.
 * 사용자와 Haru AI 간의 대화 세션을 관리한다.
 */
@Entity('conversations')
export class Conversation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  /** 대화 제목 갱신. */
  updateTitle(title: string): void {
    this.title = title;
  }
}
