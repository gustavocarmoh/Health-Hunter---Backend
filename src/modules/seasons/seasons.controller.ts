import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { SeasonsService } from './seasons.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { RolesGuard } from '../../common/guards/roles.guard.js'
import { Roles } from '../../common/decorators/roles.decorator.js'
import { Role } from '../../common/enums/role.enum.js'
import { CreateSeasonDto } from './dto/create-season.dto.js'

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

  @ApiOperation({
    summary: 'Criar nova temporada (Admin)',
    description:
      'Cria uma nova temporada e desativa automaticamente qualquer temporada em andamento. ' +
      'Requer role ADMIN.',
  })
  @ApiResponse({
    status: 201,
    description: 'Temporada criada com sucesso.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão (não é admin).' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  createSeason(@Body() dto: CreateSeasonDto) {
    return this.seasonsService.createSeason({
      title: dto.title,
      description: dto.description,
      starts_at: new Date(dto.starts_at),
      ends_at: new Date(dto.ends_at),
      xp_multiplier: dto.xp_multiplier,
      is_active: true,
    })
  }

  @ApiOperation({
    summary: 'Encerrar temporada (Admin)',
    description:
      'Encerra uma temporada, distribui rewards ao top 3 e marca como inativa. ' +
      'Requer role ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'UUID da temporada.' })
  @ApiResponse({
    status: 200,
    description: 'Temporada encerrada com sucesso.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão (não é admin).' })
  @ApiResponse({ status: 404, description: 'Temporada não encontrada.' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/end')
  endSeason(@Param('id') id: string) {
    return this.seasonsService.endSeason(id)
  }
}
