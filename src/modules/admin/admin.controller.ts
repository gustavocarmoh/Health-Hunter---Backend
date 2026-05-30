import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { AssignRoleDto } from './dto/assign-role.dto'
import { AssignRankDto } from './dto/assign-rank.dto'
import { CreateChallengeDto } from './dto/create-challenge.dto'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role } from '../../common/enums/role.enum'
import { IUser } from '../../common/interfaces/user.interface'

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: 'Listar usuários',
    description: 'Paginação e busca por nome/email sobre todos os hunters cadastrados.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Texto para filtrar por nome ou email',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuários.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado — requer Role ADMIN.',
  })
  @Get('users')
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.adminService.getUsers(Number(page), Number(limit), search)
  }

  @ApiOperation({
    summary: 'Atribuir Role',
    description: 'Altera a Role de um usuário e registra a ação no log de auditoria.',
  })
  @ApiParam({ name: 'id', description: 'UUID do usuário alvo.' })
  @ApiResponse({
    status: 200,
    description: 'Role atualizada. Auditoria registrada.',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @Patch('users/:id/assign-role')
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto, @CurrentUser() admin: IUser) {
    return this.adminService.assignRole(id, admin.id, dto)
  }

  @ApiOperation({
    summary: 'Atribuir Rank manualmente',
    description:
      'Força a mudança de rank de um Hunter (ex: promoção em eventos especiais). Auditado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do usuário alvo.' })
  @ApiResponse({
    status: 200,
    description: 'Rank atualizado. Auditoria registrada.',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @Patch('users/:id/assign-rank')
  assignRank(@Param('id') id: string, @Body() dto: AssignRankDto, @CurrentUser() admin: IUser) {
    return this.adminService.assignRank(id, admin.id, dto)
  }

  @ApiOperation({
    summary: 'Criar desafio / quest',
    description: 'Cadastra um novo desafio gamificado com requisitos de rank, XP e recompensas.',
  })
  @ApiResponse({ status: 201, description: 'Desafio criado com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 422, description: 'Dados inválidos.' })
  @Post('challenges/create')
  createChallenge(@Body() dto: CreateChallengeDto) {
    return this.adminService.createChallenge(dto)
  }

  @ApiOperation({
    summary: 'Logs de auditoria',
    description: 'Histórico paginado de todas as ações administrativas executadas no sistema.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de registros de auditoria.',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @Get('audit-logs')
  getAuditLogs(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.adminService.getAuditLogs(Number(page), Number(limit))
  }

  @ApiOperation({
    summary: 'Estatísticas do sistema',
    description:
      'Retorna métricas gerais: total de hunters, novos na semana, atividades hoje, XP total hoje e eventos ativos.',
  })
  @ApiResponse({ status: 200, description: 'Estatísticas do sistema.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @Get('stats')
  getStats() {
    return this.adminService.getStats()
  }

  @ApiOperation({
    summary: 'Criar evento',
    description: 'Cadastra um novo evento (RAID ou CAMPAIGN) com filtro regional opcional.',
  })
  @ApiResponse({ status: 201, description: 'Evento criado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 422, description: 'Dados inválidos.' })
  @Post('events/create')
  createEvent(@Body() dto: CreateEventDto, @CurrentUser() admin: IUser) {
    return this.adminService.createEvent(dto, admin.id)
  }

  @ApiOperation({
    summary: 'Atualizar evento',
    description: 'Altera campos de um evento existente. Auditado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do evento.' })
  @ApiResponse({ status: 200, description: 'Evento atualizado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  @Patch('events/:id')
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() admin: IUser) {
    return this.adminService.updateEvent(id, dto, admin.id)
  }

  @ApiOperation({
    summary: 'Participantes do evento',
    description: 'Lista os hunters inscritos em um evento com XP contribuído.',
  })
  @ApiParam({ name: 'id', description: 'UUID do evento.' })
  @ApiResponse({ status: 200, description: 'Lista de participantes.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  @Get('events/:id/participants')
  getEventParticipants(@Param('id') id: string) {
    return this.adminService.getEventParticipants(id)
  }

  @ApiOperation({
    summary: 'Remover usuário',
    description: 'Exclui permanentemente (hard delete) um hunter do sistema. Auditado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do usuário a remover.' })
  @ApiResponse({ status: 200, description: 'Usuário removido.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() admin: IUser) {
    return this.adminService.hardDeleteUser(id, admin.id)
  }

  @ApiOperation({
    summary: 'Listar todos os eventos',
    description: 'Lista todos os eventos (ativos e encerrados) com paginação.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista paginada de eventos.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @Get('events')
  getAllEvents(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllEvents(Number(page), Number(limit))
  }

  @ApiOperation({
    summary: 'Listar todos os desafios',
    description: 'Lista todos os desafios (ativos e inativos) com paginação.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista de desafios.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @Get('challenges')
  getAllChallenges(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllChallenges(Number(page), Number(limit))
  }

  @ApiOperation({
    summary: 'Atualizar desafio',
    description: 'Edita campos de um desafio existente. Auditado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do desafio.' })
  @ApiResponse({ status: 200, description: 'Desafio atualizado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Desafio não encontrado.' })
  @Patch('challenges/:id')
  updateChallenge(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() admin: IUser,
  ) {
    return this.adminService.updateChallenge(id, body, admin.id)
  }

  @ApiOperation({
    summary: 'Criar conquista',
    description: 'Adiciona uma nova conquista ao catálogo do sistema.',
  })
  @ApiResponse({ status: 201, description: 'Conquista criada.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @Post('achievements')
  createAchievement(@Body() body: Record<string, unknown>) {
    return this.adminService.createAchievement(body)
  }

  @ApiOperation({
    summary: 'Remover evento',
    description: 'Remove permanentemente um evento do sistema. Auditado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do evento.' })
  @ApiResponse({ status: 200, description: 'Evento removido.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  @Delete('events/:id')
  deleteEvent(@Param('id') id: string, @CurrentUser() admin: IUser) {
    return this.adminService.deleteEvent(id, admin.id)
  }
}
