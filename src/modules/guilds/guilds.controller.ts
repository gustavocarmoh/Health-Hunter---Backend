import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { GuildsService } from './guilds.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'
import { GuildMemberRole } from '../../common/enums/guild.enum.js'

@ApiTags('guilds')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('guilds')
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  /**
   * Retorna a guilda do hunter autenticado.
   * Declarado antes de /:id para evitar conflito de rotas.
   *
   * @returns Guilda e membership ou { guild: null } se não pertencer a nenhuma
   */
  @ApiOperation({
    summary: 'Minha guilda',
    description:
      'Retorna a guilda e o papel do hunter autenticado. Retorna `guild: null` se não pertencer a nenhuma.',
  })
  @ApiResponse({ status: 200, description: 'Dados da guilda do hunter.' })
  @Get('my')
  getMyGuild(@CurrentUser() user: IUser) {
    return this.guildsService.getMyGuild(user.id)
  }

  /**
   * Lista os membros da guilda do hunter autenticado.
   *
   * @returns Array de membros da guilda ou [] se não pertencer a nenhuma
   */
  @ApiOperation({
    summary: 'Membros da minha guilda',
    description:
      'Retorna lista de membros da guilda do hunter autenticado. Retorna [] se não pertencer a nenhuma.',
  })
  @ApiResponse({ status: 200, description: 'Lista de membros da guilda.' })
  @Get('my/members')
  getMyGuildMembers(@CurrentUser() user: IUser) {
    return this.guildsService.getMyGuildMembers(user.id)
  }

  /**
   * Lista os convites pendentes endereçados ao hunter autenticado.
   * Declarado antes de /:id para evitar conflito de rotas.
   *
   * @returns Array de convites com dados das guildas
   */
  @ApiOperation({
    summary: 'Meus convites pendentes',
    description: 'Lista os convites de guilda pendentes recebidos pelo hunter autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Convites pendentes.' })
  @Get('invites')
  getMyInvites(@CurrentUser() user: IUser) {
    return this.guildsService.getMyInvites(user.id)
  }

  /**
   * Sai da guilda do hunter autenticado.
   * O MASTER não pode sair sem transferir a liderança antes.
   *
   * @returns Confirmação de saída
   */
  @ApiOperation({
    summary: 'Sair da guilda',
    description:
      'Remove o hunter autenticado da guilda. O MASTER não pode sair sem transferir a liderança.',
  })
  @ApiResponse({ status: 200, description: 'Saiu da guilda.' })
  @ApiResponse({
    status: 400,
    description: 'MASTER não pode sair diretamente.',
  })
  @Delete('my/leave')
  leaveMyGuild(@CurrentUser() user: IUser) {
    return this.guildsService.leaveGuild(user.id)
  }

  /**
   * Lista todas as guildas públicas com busca e paginação.
   *
   * @param page - Página (padrão 1)
   * @param limit - Itens por página (padrão 20)
   * @param search - Termo de busca por nome ou tag
   */
  @ApiOperation({
    summary: 'Listar guildas públicas',
    description:
      'Retorna guildas públicas ativas ordenadas por XP total. Suporta busca por nome ou tag.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: 'Blade' })
  @ApiResponse({ status: 200, description: 'Lista paginada de guildas.' })
  @Get()
  listGuilds(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.guildsService.listGuilds(Number(page), Number(limit), search)
  }

  /**
   * Cria uma nova guilda. Requer rank mínimo C.
   *
   * @param body - Dados da guilda (name, tag, description?, emblem?, is_public?)
   */
  @ApiOperation({
    summary: 'Criar guilda',
    description:
      'Cria uma nova guilda e define o criador como MASTER. ' +
      'Exige rank mínimo C. O hunter não pode pertencer ou ser mestre de outra guilda.',
  })
  @ApiResponse({ status: 201, description: 'Guilda criada.' })
  @ApiResponse({
    status: 400,
    description: 'Rank insuficiente ou dados inválidos.',
  })
  @ApiResponse({
    status: 409,
    description: 'Tag já em uso ou hunter já possui/pertence a uma guilda.',
  })
  @Post()
  createGuild(@CurrentUser() user: IUser, @Body() body: Record<string, unknown>) {
    return this.guildsService.createGuild(user.id, body as never)
  }

  /**
   * Responde a um convite de guilda.
   * Rota estática declarada antes de /:id para evitar conflito.
   *
   * @param inviteId - UUID do convite
   * @param body - { accept: boolean }
   */
  @ApiOperation({
    summary: 'Responder convite',
    description:
      'Aceita ou recusa um convite de guilda. O convite deve estar pendente e dentro do prazo de validade.',
  })
  @ApiParam({ name: 'inviteId', description: 'UUID do convite.' })
  @ApiResponse({ status: 200, description: 'Convite respondido.' })
  @ApiResponse({
    status: 400,
    description: 'Convite expirado ou já respondido.',
  })
  @ApiResponse({ status: 403, description: 'Convite não é para este hunter.' })
  @Post('invites/:inviteId/respond')
  respondToInvite(
    @CurrentUser() user: IUser,
    @Param('inviteId') inviteId: string,
    @Body() body: { accept: boolean },
  ) {
    return this.guildsService.respondToInvite(inviteId, user.id, body.accept)
  }

  /**
   * Retorna o perfil de uma guilda com seus membros.
   *
   * @param id - UUID da guilda
   */
  @ApiOperation({
    summary: 'Perfil de guilda',
    description:
      'Retorna dados completos de uma guilda: info, rank, bônus de XP e lista de membros.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiResponse({ status: 200, description: 'Perfil da guilda.' })
  @ApiResponse({ status: 404, description: 'Guilda não encontrada.' })
  @Get(':id')
  getGuild(@Param('id') id: string) {
    return this.guildsService.getGuild(id)
  }

  /**
   * Edita dados da guilda. Apenas o MASTER pode executar.
   *
   * @param id - UUID da guilda
   * @param body - Campos editáveis (name, description, emblem, is_public)
   */
  @ApiOperation({
    summary: 'Editar guilda',
    description:
      'Atualiza nome, descrição, emblema ou visibilidade. Somente o MASTER pode executar. A tag não é editável.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiResponse({ status: 200, description: 'Guilda atualizada.' })
  @ApiResponse({ status: 403, description: 'Apenas o MASTER pode editar.' })
  @Patch(':id')
  updateGuild(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.guildsService.updateGuild(id, user.id, body)
  }

  /**
   * Dissolve a guilda permanentemente. Apenas o MASTER pode executar.
   *
   * @param id - UUID da guilda
   */
  @ApiOperation({
    summary: 'Dissolver guilda',
    description: 'Remove todos os membros e marca a guilda como disbandada. Irreversível.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiResponse({ status: 200, description: 'Guilda dissolvida.' })
  @ApiResponse({ status: 403, description: 'Apenas o MASTER pode dissolver.' })
  @Delete(':id')
  disbandGuild(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.guildsService.disbandGuild(id, user.id)
  }

  /**
   * Envia um convite para um hunter. Exige papel MASTER ou VICE_MASTER.
   *
   * @param id - UUID da guilda
   * @param body - { user_id: string } — UUID do hunter a convidar
   */
  @ApiOperation({
    summary: 'Convidar hunter',
    description:
      'Envia um convite de guilda a um hunter. ' +
      'Exige papel MASTER ou VICE_MASTER. ' +
      'O convite expira em 7 dias.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiResponse({ status: 201, description: 'Convite enviado.' })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente.' })
  @ApiResponse({
    status: 409,
    description: 'Convite pendente já existe ou hunter já tem guilda.',
  })
  @Post(':id/invite')
  inviteMember(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() body: { user_id: string },
  ) {
    return this.guildsService.inviteMember(id, user.id, body.user_id)
  }

  /**
   * Entra em uma guilda pública.
   */
  @Post(':id/join')
  joinGuild(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.guildsService.joinGuild(id, user.id)
  }

  /**
   * Sai da guilda. O MASTER deve dissolver a guilda ou transferir a liderança antes.
   *
   * @param id - UUID da guilda
   */
  @ApiOperation({
    summary: 'Sair da guilda',
    description:
      'Remove o hunter autenticado da guilda. O MASTER não pode sair sem transferir a liderança.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiResponse({ status: 200, description: 'Saiu da guilda.' })
  @ApiResponse({
    status: 400,
    description: 'MASTER não pode sair diretamente.',
  })
  @Delete(':id/leave')
  leaveGuild(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.guildsService.leaveGuild(user.id)
  }

  /**
   * Expulsa um membro da guilda. Exige papel MASTER ou VICE_MASTER.
   *
   * @param id - UUID da guilda
   * @param userId - UUID do membro a expulsar
   */
  @ApiOperation({
    summary: 'Expulsar membro',
    description: 'Remove um membro da guilda. VICE_MASTER não pode expulsar o MASTER.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiParam({ name: 'userId', description: 'UUID do membro a expulsar.' })
  @ApiResponse({ status: 200, description: 'Membro expulso.' })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente.' })
  @Delete(':id/kick/:userId')
  kickMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: IUser) {
    return this.guildsService.kickMember(id, user.id, userId)
  }

  /**
   * Altera o papel de um membro. Apenas o MASTER pode executar.
   * O papel MASTER não pode ser atribuído via este endpoint.
   *
   * @param id - UUID da guilda
   * @param userId - UUID do membro alvo
   * @param body - { role: GuildMemberRole }
   */
  @ApiOperation({
    summary: 'Alterar papel de membro',
    description:
      'Promove ou rebaixa um membro (VICE_MASTER, ELITE, MEMBER). ' +
      'Para transferir a liderança use PATCH /:id/transfer-leadership.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiParam({ name: 'userId', description: 'UUID do membro alvo.' })
  @ApiResponse({ status: 200, description: 'Papel atualizado.' })
  @ApiResponse({
    status: 403,
    description: 'Apenas o MASTER pode alterar papéis.',
  })
  @Patch(':id/members/:userId/role')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: IUser,
    @Body() body: { role: GuildMemberRole },
  ) {
    return this.guildsService.updateMemberRole(id, user.id, userId, body.role)
  }

  /**
   * Transfere a liderança para outro membro.
   * O mestre atual passa a ser VICE_MASTER.
   *
   * @param id - UUID da guilda
   * @param body - { new_master_id: string }
   */
  @ApiOperation({
    summary: 'Transferir liderança',
    description:
      'Passa o papel de MASTER para outro membro. ' +
      'O antigo mestre recebe o papel de VICE_MASTER automaticamente.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiResponse({ status: 200, description: 'Liderança transferida.' })
  @ApiResponse({
    status: 403,
    description: 'Apenas o MASTER atual pode transferir.',
  })
  @Patch(':id/transfer-leadership')
  transferLeadership(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() body: { new_master_id: string },
  ) {
    return this.guildsService.transferLeadership(id, user.id, body.new_master_id)
  }

  /**
   * Retorna o ranking interno de contribuição da guilda.
   *
   * @param id - UUID da guilda
   * @param limit - Máximo de posições (padrão 20)
   */
  @ApiOperation({
    summary: 'Leaderboard da guilda',
    description: 'Retorna os membros com maior contribution_xp na guilda, em ordem decrescente.',
  })
  @ApiParam({ name: 'id', description: 'UUID da guilda.' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Ranking de contribuição.' })
  @Get(':id/leaderboard')
  getGuildLeaderboard(@Param('id') id: string, @Query('limit') limit = 20) {
    return this.guildsService.getGuildLeaderboard(id, Number(limit))
  }
}
