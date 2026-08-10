import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ChatMessageDto {
  @ApiProperty({
    description: 'UUID da conversa existente. Se omitido, cria uma nova conversa.',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  conversation_id?: string

  @ApiProperty({
    description: 'Mensagem do usuário.',
    example: 'Como posso melhorar meu cardio?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string
}
