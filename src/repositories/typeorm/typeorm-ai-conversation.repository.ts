import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiConversationEntity } from '../../database/entities/ai-conversation.entity.js'
import { AiConversationRepository } from '../abstract/ai-conversation.repository.js'

@Injectable()
export class TypeOrmAiConversationRepository extends AiConversationRepository {
  constructor(
    @InjectRepository(AiConversationEntity)
    private readonly repo: Repository<AiConversationEntity>,
  ) {
    super()
  }

  async create(data: { user_id: string; title?: string }): Promise<AiConversationEntity> {
    const entity = this.repo.create(data)
    return this.repo.save(entity)
  }

  async findById(id: string): Promise<AiConversationEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['messages'],
    })
  }

  async findByUserId(userId: string): Promise<AiConversationEntity[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      relations: ['messages'],
    })
  }

  async findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ conversations: AiConversationEntity[]; total: number }> {
    const [conversations, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['messages'],
    })
    return { conversations, total }
  }

  async update(id: string, data: Partial<AiConversationEntity>): Promise<AiConversationEntity> {
    await this.repo.update(id, data)
    const updated = await this.repo.findOne({ where: { id }, relations: ['messages'] })
    return updated!
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
