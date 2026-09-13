import { AiConversationEntity } from '../../database/entities/ai-conversation.entity.js'

export abstract class AiConversationRepository {
  abstract create(data: { user_id: string; title?: string }): Promise<AiConversationEntity>

  abstract findById(id: string): Promise<AiConversationEntity | null>

  abstract findByUserId(userId: string): Promise<AiConversationEntity[]>

  abstract findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ conversations: AiConversationEntity[]; total: number }>

  abstract update(id: string, data: Partial<AiConversationEntity>): Promise<AiConversationEntity>

  abstract delete(id: string): Promise<void>
}
