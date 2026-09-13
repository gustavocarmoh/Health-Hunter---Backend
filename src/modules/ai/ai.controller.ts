import { Controller, Post, Get, Delete, Body, Param, UseGuards, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'
import { AiService } from './ai.service.js'
import { ChatMessageDto } from './dto/chat-message.dto.js'

@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({
    summary: 'Enviar mensagem para IA',
    description:
      'Envia uma mensagem para o assistente de IA e recebe resposta em streaming via Server-Sent Events (SSE). ' +
      'Se `conversation_id` for omitido, cria uma nova conversa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stream SSE iniciado. Cliente recebe chunks da resposta.',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido ou erro na IA.',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversa não encontrada.',
  })
  @Post('chat')
  async chat(
    @Body() dto: ChatMessageDto,
    @CurrentUser() user: IUser,
    @Res() res: Response,
  ): Promise<void> {
    // Configurar headers SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    try {
      const stream = await this.aiService.chat(user.id, dto)

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
      res.end()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
      res.end()
    }
  }

  @ApiOperation({
    summary: 'Listar conversas',
    description: 'Retorna lista paginada de conversas do usuário autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conversas com meta.',
  })
  @Get('conversations')
  async getConversations(
    @CurrentUser() user: IUser,
  ): Promise<{ conversations: unknown[]; total: number }> {
    return this.aiService.getConversations(user.id, 1, 20)
  }

  @ApiOperation({
    summary: 'Obter histórico de conversa',
    description: 'Retorna todas as mensagens de uma conversa específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de mensagens.',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversa não encontrada.',
  })
  @Get('conversations/:id')
  async getConversationHistory(
    @Param('id') conversationId: string,
    @CurrentUser() user: IUser,
  ): Promise<{ messages: unknown[]; total: number }> {
    return this.aiService.getConversationHistory(user.id, conversationId)
  }

  @ApiOperation({
    summary: 'Deletar conversa',
    description: 'Remove uma conversa e todo seu histórico (LGPD).',
  })
  @ApiResponse({
    status: 204,
    description: 'Conversa deletada com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversa não encontrada.',
  })
  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    await this.aiService.deleteConversation(user.id, conversationId)
  }
}
