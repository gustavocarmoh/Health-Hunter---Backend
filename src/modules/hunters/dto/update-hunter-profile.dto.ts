import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { LifestyleType } from '../../../common/enums/lifestyle.enum'

export class UpdateHunterProfileDto {
  @ApiPropertyOptional({
    description: 'Novo nome de exibição do Hunter.',
    example: 'Sung Jin-Woo',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({
    description: 'Estilo de vida do Hunter (afeta sugestões de treino).',
    enum: LifestyleType,
    example: LifestyleType.HARDCORE,
  })
  @IsOptional()
  @IsEnum(LifestyleType)
  lifestyle?: LifestyleType

  @ApiPropertyOptional({
    description: 'Estado ou província de residência.',
    example: 'SP',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region_state?: string

  @ApiPropertyOptional({
    description: 'País de residência (código ISO).',
    example: 'BR',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region_country?: string

  @ApiPropertyOptional({
    description: 'Cidade de residência.',
    example: 'São Paulo',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string
}
