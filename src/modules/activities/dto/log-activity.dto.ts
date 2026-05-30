import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsInt,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsOptional,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GpsCoordinatesDto {
  @ApiProperty({
    description: 'Latitude em graus decimais.',
    example: -23.5505,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @ApiProperty({
    description: 'Longitude em graus decimais.',
    example: -46.6333,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number

  @ApiPropertyOptional({
    description: 'Altitude em metros (opcional).',
    example: 760,
  })
  @IsOptional()
  @IsNumber()
  altitude?: number
}

export class LogActivityDto {
  @ApiProperty({
    description: 'Distância percorrida em metros. Máximo de 200 km por sessão (anti-fraude).',
    example: 5000,
    minimum: 1,
    maximum: 200000,
  })
  @IsNumber()
  @Min(1)
  @Max(200_000)
  distancia_m: number

  @ApiProperty({
    description: 'Duração da atividade em segundos. Mínimo de 1 minuto.',
    example: 1800,
    minimum: 60,
    maximum: 86400,
  })
  @IsInt()
  @Min(60)
  @Max(86400)
  duracao_seg: number

  @ApiProperty({
    description: 'Tipo do exercício realizado.',
    example: 'Corrida',
  })
  @IsString()
  @IsNotEmpty()
  tipo_exercicio: string

  @ApiProperty({
    description: 'Coordenadas GPS do local de treino. Campo sensível — mascarado nos logs.',
    type: GpsCoordinatesDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => GpsCoordinatesDto)
  coordenadas_gps: GpsCoordinatesDto

  @ApiProperty({
    description: 'BPM médio durante a atividade (30-220). Campo sensível — mascarado nos logs.',
    example: 145,
    minimum: 30,
    maximum: 220,
  })
  @IsInt()
  @Min(30)
  @Max(220)
  bpm_medio: number
}
