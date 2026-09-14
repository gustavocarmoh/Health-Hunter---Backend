import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenAI } from '@google/genai'
import { AiConversationRepository } from '../../repositories/abstract/ai-conversation.repository.js'
import { AiMessageRepository } from '../../repositories/abstract/ai-message.repository.js'
import { AiConversationEntity } from '../../database/entities/ai-conversation.entity.js'
import { AiMessageEntity, MessageRole } from '../../database/entities/ai-message.entity.js'
import { ChatMessageDto } from './dto/chat-message.dto.js'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly genAI: GoogleGenAI
  // Modelo gratuito (tier free do Google AI Studio) — rápido o suficiente para chat em tempo real
  private readonly model: string

  private readonly SYSTEM_PROMPT = `Você é um assistente de IA no Health Hunter, um aplicativo gamificado de fitness.
Você age como um personal trainer e mentor motivador para usuários que buscam melhorar sua saúde e fitness.

Seu papel é:
- Fornecer dicas personalizadas de treino, nutrição e estilo de vida saudável
- Motivar e celebrar o progresso dos usuários
- Responder perguntas sobre fitness, saúde e bem-estar
- Sugerir desafios e metas alcançáveis
- Ser empático e encorajador

Mantenha as respostas concisas (máximo 300 caracteres quando possível) e use linguagem amigável.
Evite conselhos médicos específicos e sempre recomende consultar um profissional quando apropriado.`

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationRepository: AiConversationRepository,
    private readonly messageRepository: AiMessageRepository,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY não configurada — o mentor de IA falhará ao ser chamado. ' +
          'Obtenha uma chave gratuita em https://aistudio.google.com/apikey',
      )
    }
    this.model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash'
    this.genAI = new GoogleGenAI({ apiKey: apiKey || '' })
    this.logger.log(`Gemini model: ${this.model}`)
  }

  async chat(userId: string, dto: ChatMessageDto): Promise<AsyncIterable<string>> {
    const { conversation_id, message } = dto

    let conversation: AiConversationEntity

    if (conversation_id) {
      const existing = await this.conversationRepository.findById(conversation_id)
      if (!existing) {
        throw new NotFoundException(`Conversa ${conversation_id} não encontrada`)
      }
      if (existing.user_id !== userId) {
        throw new BadRequestException('Acesso negado a esta conversa')
      }
      conversation = existing
    } else {
      conversation = await this.conversationRepository.create({
        user_id: userId,
        title: message.substring(0, 100),
      })
    }

    await this.messageRepository.create({
      conversation_id: conversation.id,
      role: MessageRole.USER,
      content: message,
    })

    const messages = await this.messageRepository.findByConversationId(conversation.id)
    const recentMessages = messages.slice(-10)

    const history = recentMessages
      .map((msg) => `${msg.role === MessageRole.USER ? 'Usuário' : 'Mentor'}: ${msg.content}`)
      .join('\n')

    const fullPrompt = `${this.SYSTEM_PROMPT}

## Histórico da Conversa
${history}

## Nova Mensagem
Usuário: ${message}

Mentor:`

    return this.streamResponse(fullPrompt, conversation.id)
  }

  private async *streamResponse(prompt: string, conversationId: string): AsyncIterable<string> {
    let fullResponse = ''

    try {
      const stream = await this.genAI.models.generateContentStream({
        model: this.model,
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      })

      for await (const chunk of stream) {
        const text = chunk.text
        if (text) {
          fullResponse += text
          yield text
        }
      }

      if (fullResponse.trim()) {
        await this.messageRepository.create({
          conversation_id: conversationId,
          role: MessageRole.ASSISTANT,
          content: fullResponse.trim(),
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error(`Erro ao chamar Gemini: ${errorMsg}`)
      throw new BadRequestException(`Erro ao gerar resposta da IA: ${errorMsg}`)
    }
  }

  async getConversations(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ conversations: AiConversationEntity[]; total: number }> {
    return this.conversationRepository.findByUserIdPaginated(userId, page, limit)
  }

  async getConversationHistory(
    userId: string,
    conversationId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: AiMessageEntity[]; total: number }> {
    const conversation = await this.conversationRepository.findById(conversationId)
    if (!conversation) {
      throw new NotFoundException(`Conversa não encontrada`)
    }
    if (conversation.user_id !== userId) {
      throw new BadRequestException('Acesso negado a esta conversa')
    }

    return this.messageRepository.findByConversationIdPaginated(conversationId, page, limit)
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.findById(conversationId)
    if (!conversation) {
      throw new NotFoundException(`Conversa não encontrada`)
    }
    if (conversation.user_id !== userId) {
      throw new BadRequestException('Acesso negado a esta conversa')
    }

    await this.messageRepository.deleteByConversationId(conversationId)
    await this.conversationRepository.delete(conversationId)
  }
}
