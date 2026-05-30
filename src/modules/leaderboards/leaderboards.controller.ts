import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { LeaderboardsService } from './leaderboards.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IUser } from '../../common/interfaces/user.interface'

@ApiTags('leaderboards')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @ApiOperation({
    summary: 'Ranking global',
    description: 'Top 100 hunters com maior XP em todo o sistema. Cache Redis (TTL 5 min).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista dos top 100 hunters globais.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('global')
  getGlobal() {
    return this.leaderboardsService.getGlobal()
  }

  @ApiOperation({
    summary: 'Ranking regional',
    description: 'Top 100 hunters de um estado/país específico. Cache Redis (TTL 5 min).',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'Sigla ou nome do estado/província.',
    example: 'SP',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Código ISO do país.',
    example: 'BR',
  })
  @ApiResponse({ status: 200, description: 'Lista dos top hunters regionais.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('regional')
  getRegional(@Query('state') state?: string, @Query('country') country?: string) {
    return this.leaderboardsService.getRegional(state, country)
  }

  @ApiOperation({
    summary: 'Ranking local',
    description: 'Top 100 hunters de uma cidade específica. Cache Redis (TTL 5 min).',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    description: 'Nome da cidade.',
    example: 'São Paulo',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'Estado da cidade (desambiguação).',
    example: 'SP',
  })
  @ApiResponse({ status: 200, description: 'Lista dos top hunters locais.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('local')
  getLocal(@Query('city') city?: string, @Query('state') state?: string) {
    return this.leaderboardsService.getLocal(city, state)
  }

  @ApiOperation({
    summary: 'Ranking global com cursor pagination',
    description:
      'Ranking global paginado por cursor (keyset pagination). Use `nextCursor` retornado para buscar a próxima página. Eficiente em tabelas grandes — sem degradação por OFFSET.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Registros por página (padrão 20, máx 100).',
    example: 20,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor opaco da página anterior (retornado em `nextCursor`).',
    example: '',
  })
  @ApiResponse({
    status: 200,
    description: 'Página de hunters + nextCursor (null se última página).',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('global/cursor')
  getGlobalCursor(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 20, 100) : 20
    return this.leaderboardsService.getGlobalCursor(parsedLimit, cursor)
  }

  @ApiOperation({
    summary: 'Minha posição no ranking',
    description: 'Retorna a posição do Hunter autenticado no ranking global, regional e local.',
  })
  @ApiResponse({
    status: 200,
    description: 'Posições do Hunter nos três escopos.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Hunter não encontrado.' })
  @Get('me')
  getMyPosition(@CurrentUser() user: IUser) {
    return this.leaderboardsService.getMyPosition(user.id)
  }

  @ApiOperation({
    summary: 'Ranking de amigos',
    description: 'Leaderboard dos hunters que o Hunter autenticado segue, ordenados por XP.',
  })
  @ApiResponse({ status: 200, description: 'Leaderboard de amigos.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('friends')
  getFriendsLeaderboard(@CurrentUser() user: IUser) {
    return this.leaderboardsService.getFriendsLeaderboard(user.id)
  }
}
