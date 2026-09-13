import {
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { GpsCoordinatesDto } from './log-activity.dto.js'

export class UpdateActivityDto {
  @ApiPropertyOptional({
    description: 'Distância percorrida em metros (1 a 200 km).',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200_000)
  distancia_m?: number

  @ApiPropertyOptional({
    description: 'Duração em segundos (1 minuto a 24 horas).',
    example: 1800,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  duracao_seg?: number

  @ApiPropertyOptional({
    description: 'Tipo de exercício.',
    example: 'Corrida',
  })
  @IsOptional()
  @IsString()
  tipo_exercicio?: string

  @ApiPropertyOptional({
    description: 'Coordenadas GPS.',
    type: GpsCoordinatesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GpsCoordinatesDto)
  coordenadas_gps?: GpsCoordinatesDto

  @ApiPropertyOptional({
    description: 'BPM médio (30-220).',
    example: 145,
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(220)
  bpm_medio?: number
}
