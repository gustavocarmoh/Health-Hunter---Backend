import { AiMessageEntity, MessageRole } from '../../database/entities/ai-message.entity'

export abstract class AiMessageRepository {
  abstract create(data: {
    conversation_id: string
    role: MessageRole
    content: string
  }): Promise<AiMessageEntity>

  abstract findById(id: string): Promise<AiMessageEntity | null>

  abstract findByConversationId(conversationId: string): Promise<AiMessageEntity[]>

  abstract findByConversationIdPaginated(
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<{ messages: AiMessageEntity[]; total: number }>

  abstract deleteByConversationId(conversationId: string): Promise<void>
}
