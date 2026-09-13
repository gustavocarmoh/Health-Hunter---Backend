import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { AiMessageEntity } from './ai-message.entity.js'

@Entity('ai_conversations')
export class AiConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  user_id: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string

  @OneToMany(() => AiMessageEntity, (message) => message.conversation, { cascade: true })
  messages: AiMessageEntity[]

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date
}
