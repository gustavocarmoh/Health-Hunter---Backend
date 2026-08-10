import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { ActivitiesService } from './activities.service'
import { LogActivityDto } from './dto/log-activity.dto'
import { UpdateActivityDto } from './dto/update-activity.dto'
import { PaginationDto } from './dto/pagination.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IUser } from '../../common/interfaces/user.interface'

@ApiTags('activities')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @ApiOperation({
    summary: 'Registrar atividade física',
    description:
      'Processa uma atividade concluída: valida anti-fraude (velocidade máx. 50 km/h), ' +
      'calcula XP com multiplicador de rank, atualiza progresso e verifica rank-up. ' +
      'Limitado a 10 registros/minuto por Hunter.',
  })
  @ApiResponse({
    status: 201,
    description: 'Atividade registrada. Retorna XP ganho e novo total.',
  })
  @ApiResponse({
    status: 400,
    description: 'Atividade suspeita detectada pelo sistema anti-fraude.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido.' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('log')
  logActivity(@CurrentUser() user: IUser, @Body() dto: LogActivityDto) {
    return this.activitiesService.logActivity(user.id, dto)
  }

  @ApiOperation({
    summary: 'Histórico de atividades',
    description: 'Lista paginada das atividades registradas pelo Hunter autenticado.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página (padrão 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão 20, máx. 100)',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de atividades.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('history')
  getHistory(@CurrentUser() user: IUser, @Query() query: PaginationDto) {
    return this.activitiesService.getHistory(user.id, query.page, query.limit)
  }

  @ApiOperation({
    summary: 'Resumo geral',
    description:
      'Agrega estatísticas totais do Hunter: distância acumulada, atividades, XP e melhores sessões.',
  })
  @ApiResponse({ status: 200, description: 'Resumo de atividades do Hunter.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('summary')
  getSummary(@CurrentUser() user: IUser) {
    return this.activitiesService.getSummary(user.id)
  }

  @ApiOperation({
    summary: 'Resumo semanal por dia',
    description:
      'Retorna XP, distância e contagem de atividades agrupados por dia nos últimos 7 dias.',
  })
  @ApiResponse({ status: 200, description: 'Resumo dos 7 dias anteriores.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('weekly-summary')
  getWeeklySummary(@CurrentUser() user: IUser) {
    return this.activitiesService.getWeeklySummary(user.id)
  }

  @ApiOperation({
    summary: 'Streaks de atividade',
    description: 'Retorna o streak atual (dias consecutivos com atividade) e o recorde histórico.',
  })
  @ApiResponse({ status: 200, description: 'Streak atual e recorde.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('streaks')
  getStreaks(@CurrentUser() user: IUser) {
    return this.activitiesService.getStreaks(user.id)
  }

  @ApiOperation({
    summary: 'Detalhe de atividade',
    description: 'Retorna todos os campos de uma atividade específica do Hunter autenticado.',
  })
  @ApiParam({ name: 'id', description: 'UUID da atividade.' })
  @ApiResponse({ status: 200, description: 'Dados da atividade.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada.' })
  @Get(':id')
  getActivity(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.activitiesService.getActivity(id, user.id)
  }

  @ApiOperation({
    summary: 'Editar atividade',
    description:
      'Atualiza campos de uma atividade registrada. Se distância ou duração mudarem, recalcula XP/coins automaticamente.',
  })
  @ApiParam({ name: 'id', description: 'UUID da atividade.' })
  @ApiResponse({ status: 200, description: 'Atividade atualizada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada.' })
  @ApiResponse({ status: 422, description: 'Dados inválidos (ex: velocidade impossível).' })
  @Patch(':id')
  updateActivity(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activitiesService.updateActivity(id, user.id, dto)
  }

  @ApiOperation({
    summary: 'Deletar atividade',
    description:
      'Remove uma atividade e reverte o XP/coins ganhos dela (ajusta totais do Hunter).',
  })
  @ApiParam({ name: 'id', description: 'UUID da atividade.' })
  @ApiResponse({ status: 200, description: 'Atividade deletada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada.' })
  @Delete(':id')
  deleteActivity(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.activitiesService.deleteActivity(id, user.id)
  }
}
