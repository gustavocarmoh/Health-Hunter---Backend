import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm'
import { AiConversationEntity } from './ai-conversation.entity.js'

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('ai_messages')
export class AiMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  conversation_id: string

  @Column({ type: 'enum', enum: MessageRole })
  role: MessageRole

  @Column({ type: 'text' })
  content: string

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date

  @ManyToOne(() => AiConversationEntity, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Relation<AiConversationEntity>
}
