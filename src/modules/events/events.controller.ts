import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { EventsService } from './events.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IUser } from '../../common/interfaces/user.interface'

@ApiTags('events')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiOperation({
    summary: 'Eventos ativos',
    description:
      'Lista todos os eventos em andamento (raids, temporadas, desafios coletivos). ' +
      'Resultado com cache Redis (TTL 60s).',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos ativos.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('active')
  getActiveEvents(@CurrentUser() user: IUser) {
    return this.eventsService.getActiveEvents(user.id)
  }

  @ApiOperation({
    summary: 'Meus eventos',
    description: 'Lista todos os eventos em que o Hunter autenticado está inscrito.',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos do Hunter.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('my')
  getMyEvents(@CurrentUser() user: IUser) {
    return this.eventsService.getMyEvents(user.id)
  }

  @ApiOperation({
    summary: 'Detalhes do evento',
    description: 'Retorna os dados completos de um evento pelo UUID.',
  })
  @ApiParam({ name: 'id', description: 'UUID do evento.' })
  @ApiResponse({ status: 200, description: 'Dados do evento.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  @Get(':id')
  getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id)
  }

  @ApiOperation({
    summary: 'Participar de evento',
    description: 'Inscreve o Hunter autenticado no evento especificado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do evento.' })
  @ApiResponse({
    status: 201,
    description: 'Hunter inscrito com sucesso no evento.',
  })
  @ApiResponse({
    status: 400,
    description: 'Evento encerrado ou Hunter já inscrito.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  @Post(':id/join')
  joinEvent(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.eventsService.joinEvent(id, user.id)
  }

  @ApiOperation({
    summary: 'Sair de evento',
    description: 'Remove a inscrição do Hunter autenticado no evento especificado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do evento.' })
  @ApiResponse({ status: 200, description: 'Inscrição removida com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({
    status: 404,
    description: 'Evento não encontrado ou Hunter não inscrito.',
  })
  @Delete(':id/leave')
  leaveEvent(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.eventsService.leaveEvent(id, user.id)
  }

  @ApiOperation({
    summary: 'Ranking do evento',
    description: 'Retorna o placar dos participantes de um evento específico.',
  })
  @ApiParam({ name: 'id', description: 'UUID do evento.' })
  @ApiResponse({ status: 200, description: 'Leaderboard do evento.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.eventsService.getLeaderboard(id)
  }
}
