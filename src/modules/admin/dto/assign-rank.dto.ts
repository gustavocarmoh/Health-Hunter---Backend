import { IsEnum, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { HunterRank } from '../../../common/enums/rank.enum.js'

export class AssignRankDto {
  @ApiProperty({
    description: 'Rank narrativo de caçador a ser atribuído manualmente.',
    enum: HunterRank,
    example: HunterRank.S,
  })
  @IsEnum(HunterRank)
  @IsNotEmpty()
  rank_level: HunterRank
}
