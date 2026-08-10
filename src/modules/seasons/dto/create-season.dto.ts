import { IsString, IsNotEmpty, IsDateString, IsNumber, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateSeasonDto {
  @ApiProperty({
    description: 'Título da temporada.',
    example: 'Season 1 - Rise of the Hunters',
  })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({
    description: 'Descrição da temporada.',
    example: 'A primeira temporada de competição global dos hunters.',
  })
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiProperty({
    description: 'Data de início (ISO 8601).',
    example: '2026-09-01T00:00:00Z',
  })
  @IsDateString()
  starts_at: string

  @ApiProperty({
    description: 'Data de término (ISO 8601).',
    example: '2026-09-30T23:59:59Z',
  })
  @IsDateString()
  ends_at: string

  @ApiProperty({
    description: 'Multiplicador de XP durante a temporada (ex: 1.5 = +50% XP).',
    example: 1.5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  xp_multiplier: number
}
