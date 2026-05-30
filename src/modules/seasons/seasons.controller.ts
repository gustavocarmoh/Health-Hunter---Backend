import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { SeasonsService } from './seasons.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('seasons')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @ApiOperation({
    summary: 'Temporada ativa',
    description:
      'Retorna os dados da temporada em andamento: título, período, multiplicador de XP. ' +
      'Retorna `{ active: false }` quando não há temporada em curso.',
  })
  @ApiResponse({
    status: 200,
    description: 'Temporada ativa ou `active: false`.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('current')
  getCurrent() {
    return this.seasonsService.getCurrent()
  }

  @ApiOperation({
    summary: 'Ranking da temporada',
    description:
      'Retorna o top 100 hunters por XP acumulado durante o período da temporada. ' +
      'Pode ser usado para temporadas históricas (já encerradas) e para a ativa.',
  })
  @ApiParam({ name: 'id', description: 'UUID da temporada.' })
  @ApiResponse({ status: 200, description: 'Leaderboard da temporada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Temporada não encontrada.' })
  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.seasonsService.getSeasonLeaderboard(id)
  }
}
