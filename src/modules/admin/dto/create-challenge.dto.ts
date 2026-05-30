import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { HunterRank } from '../../../common/enums/rank.enum'

export class CreateChallengeDto {
  @ApiProperty({
    description: 'Título da Quest ou Raid.',
    example: 'Corrida das Sombras',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string

  @ApiProperty({
    description: 'Descrição detalhada da atividade desafiadora.',
    example: 'Complete 10km sem parar para provar sua resistência.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string

  @ApiProperty({
    description: 'Modalidade de exercício exigida.',
    example: 'Corrida',
  })
  @IsString()
  @IsNotEmpty()
  tipo_exercicio: string

  @ApiProperty({
    description: 'Pontos de XP base concedidos ao completar.',
    example: 500,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  xp_base: number

  @ApiProperty({
    description: 'Moedas base concedidas ao completar.',
    example: 200,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  coins_base: number

  @ApiProperty({
    description: 'Rank mínimo necessário para participar.',
    enum: HunterRank,
    example: HunterRank.B,
  })
  @IsEnum(HunterRank)
  min_rank_required: HunterRank

  @ApiPropertyOptional({
    description: 'Define se o desafio está visível para os hunters.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean

  @ApiPropertyOptional({
    description: 'Data/hora de início (ISO 8601).',
    example: '2025-01-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string

  @ApiPropertyOptional({
    description: 'Data/hora de encerramento (ISO 8601). Deve ser posterior a start_date.',
    example: '2025-02-15T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string
}
