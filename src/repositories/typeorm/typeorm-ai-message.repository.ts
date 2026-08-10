import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiMessageEntity, MessageRole } from '../../database/entities/ai-message.entity'
import { AiMessageRepository } from '../abstract/ai-message.repository'

@Injectable()
export class TypeOrmAiMessageRepository extends AiMessageRepository {
  constructor(
    @InjectRepository(AiMessageEntity)
    private readonly repo: Repository<AiMessageEntity>,
  ) {
    super()
  }

  async create(data: {
    conversation_id: string
    role: MessageRole
    content: string
  }): Promise<AiMessageEntity> {
    const entity = this.repo.create(data)
    return this.repo.save(entity)
  }

  async findById(id: string): Promise<AiMessageEntity | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findByConversationId(conversationId: string): Promise<AiMessageEntity[]> {
    return this.repo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
    })
  }

  async findByConversationIdPaginated(
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<{ messages: AiMessageEntity[]; total: number }> {
    const [messages, total] = await this.repo.findAndCount({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { messages, total }
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    await this.repo.delete({ conversation_id: conversationId })
  }
}
