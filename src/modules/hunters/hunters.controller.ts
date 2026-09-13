import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { HuntersService } from './hunters.service.js'
import { UpdateHunterProfileDto } from './dto/update-hunter-profile.dto.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'

@ApiTags('hunters')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hunters')
export class HuntersController {
  constructor(private readonly huntersService: HuntersService) {}

  @ApiOperation({
    summary: 'Meu perfil',
    description:
      'Retorna o perfil completo do Hunter autenticado: XP, rank, moedas, estatísticas e localização. ' +
      'Resultado com cache Redis (TTL 30s).',
  })
  @ApiResponse({ status: 200, description: 'Perfil do Hunter.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Hunter não encontrado.' })
  @Get('profile')
  getProfile(@CurrentUser() user: IUser) {
    return this.huntersService.getProfile(user.id)
  }

  @ApiOperation({
    summary: 'Atualizar perfil',
    description: 'Atualiza campos editáveis do Hunter (nome, estilo de vida, localização).',
  })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 422, description: 'Dados inválidos.' })
  @Patch('profile')
  updateProfile(@CurrentUser() user: IUser, @Body() dto: UpdateHunterProfileDto) {
    return this.huntersService.updateProfile(user.id, dto)
  }

  @ApiOperation({
    summary: 'Excluir conta (LGPD)',
    description:
      'Anonimiza os dados pessoais do Hunter conforme a LGPD. ' +
      'O registro é mantido para integridade de leaderboards históricos.',
  })
  @ApiResponse({ status: 200, description: 'Conta anonimizada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Delete('account')
  deleteAccount(@CurrentUser() user: IUser) {
    return this.huntersService.deleteAccount(user.id)
  }

  @ApiOperation({
    summary: 'Estatísticas do Hunter',
    description:
      'Retorna métricas agregadas: total de atividades, distância acumulada, XP total e streak atual.',
  })
  @ApiResponse({ status: 200, description: 'Estatísticas do Hunter.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('stats')
  getStats(@CurrentUser() user: IUser) {
    return this.huntersService.getStats(user.id)
  }

  @ApiOperation({
    summary: 'Histórico de XP',
    description: 'Lista as atividades do Hunter com os campos de XP e moedas ganhos. Paginado.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Histórico de XP.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('xp-history')
  getXpHistory(@CurrentUser() user: IUser, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.huntersService.getXpHistory(user.id, Number(page), Number(limit))
  }

  @ApiOperation({
    summary: 'Perfil público de Hunter',
    description: 'Retorna o perfil público de outro Hunter (sem dados sensíveis).',
  })
  @ApiParam({ name: 'id', description: 'UUID do Hunter alvo.' })
  @ApiResponse({ status: 200, description: 'Perfil público.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Hunter não encontrado.' })
  @Get(':id/profile')
  getPublicProfile(@Param('id') id: string) {
    return this.huntersService.getPublicProfile(id)
  }

  @ApiOperation({
    summary: 'Seguir Hunter',
    description: 'O Hunter autenticado passa a seguir o Hunter especificado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do Hunter a seguir.' })
  @ApiResponse({ status: 201, description: 'Seguindo com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível seguir a si mesmo.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 409, description: 'Já está seguindo este Hunter.' })
  @Post(':id/follow')
  follow(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.huntersService.follow(user.id, id)
  }

  @ApiOperation({
    summary: 'Deixar de seguir Hunter',
    description: 'O Hunter autenticado para de seguir o Hunter especificado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do Hunter a deixar de seguir.' })
  @ApiResponse({ status: 200, description: 'Deixou de seguir com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Delete(':id/follow')
  unfollow(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.huntersService.unfollow(user.id, id)
  }

  @ApiOperation({
    summary: 'Seguidores de um Hunter',
    description: 'Lista os hunters que seguem o Hunter especificado.',
  })
  @ApiParam({ name: 'id', description: 'UUID do Hunter alvo.' })
  @ApiResponse({ status: 200, description: 'Lista de seguidores.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Hunter não encontrado.' })
  @Get(':id/followers')
  getFollowers(@Param('id') id: string) {
    return this.huntersService.getFollowers(id)
  }

  @ApiOperation({
    summary: 'Hunters seguidos por um Hunter',
    description: 'Lista os hunters que o Hunter especificado está seguindo.',
  })
  @ApiParam({ name: 'id', description: 'UUID do Hunter alvo.' })
  @ApiResponse({ status: 200, description: 'Lista de hunters seguidos.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Hunter não encontrado.' })
  @Get(':id/following')
  getFollowing(@Param('id') id: string) {
    return this.huntersService.getFollowing(id)
  }

  @ApiOperation({
    summary: 'Feed de atividades',
    description: 'Retorna as atividades recentes dos hunters que o Hunter autenticado segue.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  @ApiResponse({ status: 200, description: 'Feed de atividades.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('feed')
  getFeed(@CurrentUser() user: IUser, @Query('limit') limit = 30) {
    return this.huntersService.getFeed(user.id, Number(limit))
  }

  @ApiOperation({
    summary: 'Amigos do Hunter autenticado',
    description: 'Lista todos os hunters que o usuário autenticado está seguindo (seus amigos).',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Lista de amigos.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('friends')
  getFriends(@CurrentUser() user: IUser, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.huntersService.getFriends(user.id, Number(page), Number(limit))
  }

  @ApiOperation({
    summary: 'Buscar hunters por nome',
    description:
      'Pesquisa hunters que combinam com o nome fornecido. Mostra se já está seguindo cada um.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Termo de busca (mínimo 2 caracteres)' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Resultados da busca.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('search')
  searchHunters(@CurrentUser() user: IUser, @Query('q') q: string, @Query('limit') limit = 20) {
    return this.huntersService.searchHunters(user.id, q, Number(limit))
  }

  @ApiOperation({
    summary: 'Sugestões de hunters para seguir',
    description: 'Retorna hunters da mesma região e rank que o Hunter ainda não segue.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Lista de sugestões.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('suggested')
  getSuggested(@CurrentUser() user: IUser, @Query('limit') limit = 10) {
    return this.huntersService.getSuggested(user.id, Number(limit))
  }

  @ApiOperation({
    summary: 'Distribuir ponto de atributo',
    description:
      'Distribui um ponto disponível em um atributo específico (strength, intelligence, vitality, sense, agility).',
  })
  @ApiResponse({ status: 200, description: 'Ponto distribuído com sucesso.' })
  @ApiResponse({ status: 400, description: 'Não há pontos disponíveis.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Post('stats/allocate')
  allocateStat(@CurrentUser() user: IUser, @Body() body: { attribute: string }) {
    return this.huntersService.allocateStat(user.id, body.attribute)
  }

  @ApiOperation({
    summary: 'Registrar medidas corporais',
    description: 'Salva uma entrada de medidas corporais (peso, altura, %gordura) do Hunter.',
  })
  @ApiResponse({ status: 201, description: 'Medidas registradas.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Post('measurements')
  logMeasurement(@CurrentUser() user: IUser, @Body() body: Record<string, unknown>) {
    return this.huntersService.logMeasurement(user.id, body)
  }

  @ApiOperation({
    summary: 'Histórico de medidas corporais',
    description: 'Lista o histórico de medidas corporais do Hunter autenticado, paginado.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Histórico de medidas.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('measurements')
  getMeasurements(@CurrentUser() user: IUser, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.huntersService.getMeasurements(user.id, Number(page), Number(limit))
  }
}
