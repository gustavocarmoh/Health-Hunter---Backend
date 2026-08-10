import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { AiConversationRepository } from '../../repositories/abstract/ai-conversation.repository'
import { AiMessageRepository } from '../../repositories/abstract/ai-message.repository'
import { AiConversationEntity } from '../../database/entities/ai-conversation.entity'
import { AiMessageEntity, MessageRole } from '../../database/entities/ai-message.entity'
import { ChatMessageDto } from './dto/chat-message.dto'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private ollamaUrl: string
  private readonly model = 'neural-chat' // Modelo leve e rápido para fitness

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
    this.ollamaUrl = this.configService.get<string>('OLLAMA_HOST') || 'http://ollama:11434'
    this.logger.log(`Ollama URL: ${this.ollamaUrl}`)
  }

  async chat(userId: string, dto: ChatMessageDto): Promise<AsyncIterable<string>> {
    const { conversation_id, message } = dto

    let conversation: AiConversationEntity

    // Encontrar ou criar conversa
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

    // Salvar mensagem do usuário
    await this.messageRepository.create({
      conversation_id: conversation.id,
      role: MessageRole.USER,
      content: message,
    })

    // Recuperar histórico da conversa (últimas 10 mensagens para contexto)
    const messages = await this.messageRepository.findByConversationId(conversation.id)
    const recentMessages = messages.slice(-10)

    // Montar histórico para Ollama
    const history = recentMessages
      .map((msg) => `${msg.role === MessageRole.USER ? 'Usuário' : 'Mentor'}: ${msg.content}`)
      .join('\n')

    // Preparar prompt final
    const fullPrompt = `${this.SYSTEM_PROMPT}

## Histórico da Conversa
${history}

## Nova Mensagem
Usuário: ${message}

Mentor:`

    // Retornar generator que faz streaming
    return this.streamResponse(fullPrompt, conversation.id)
  }

  private async *streamResponse(prompt: string, conversationId: string): AsyncIterable<string> {
    let fullResponse = ''

    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.model,
          prompt,
          stream: true,
          temperature: 0.7,
          num_predict: 200,
        },
        {
          responseType: 'stream',
          timeout: 60000,
        },
      )

      // Processar stream line-by-line
      for await (const chunk of response.data) {
        try {
          const line = chunk.toString('utf-8').trim()
          if (!line) continue

          const parsed = JSON.parse(line)
          if (parsed.response) {
            fullResponse += parsed.response
            yield parsed.response

            // Se done === true, stream terminou
            if (parsed.done) break
          }
        } catch (e) {
          // Ignorar erros de parsing, continuar
        }
      }

      // Salvar resposta completa da IA no banco
      if (fullResponse.trim()) {
        await this.messageRepository.create({
          conversation_id: conversationId,
          role: MessageRole.ASSISTANT,
          content: fullResponse.trim(),
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error(`Erro ao chamar Ollama: ${errorMsg}`)
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
