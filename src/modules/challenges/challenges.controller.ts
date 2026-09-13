import { Controller, Get, Post, Patch, Delete, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { ChallengesService } from './challenges.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'

@ApiTags('challenges')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @ApiOperation({
    summary: 'Desafios disponíveis',
    description:
      'Lista desafios ativos disponíveis para o rank do Hunter autenticado. ' +
      'Desafios com min_rank superior ao rank do Hunter são filtrados.',
  })
  @ApiResponse({ status: 200, description: 'Lista de desafios disponíveis.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get()
  getAvailable(@CurrentUser() user: IUser) {
    return this.challengesService.getAvailable(user.id)
  }

  @ApiOperation({
    summary: 'Meus desafios',
    description: 'Lista os desafios em que o Hunter está inscrito (ACTIVE, COMPLETED, ABANDONED).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de participações do Hunter.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('my')
  getMyChallenges(@CurrentUser() user: IUser) {
    return this.challengesService.getMyChallenges(user.id)
  }

  @ApiOperation({
    summary: 'Entrar em um desafio',
    description:
      'Inscreve o Hunter no desafio especificado. O desafio deve estar disponível para o rank do Hunter.',
  })
  @ApiParam({ name: 'id', description: 'UUID do desafio.' })
  @ApiResponse({ status: 201, description: 'Inscrição realizada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Rank insuficiente para este desafio.',
  })
  @ApiResponse({
    status: 404,
    description: 'Desafio não encontrado ou inativo.',
  })
  @ApiResponse({
    status: 409,
    description: 'Hunter já inscrito neste desafio.',
  })
  @Post(':id/join')
  joinChallenge(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.challengesService.joinChallenge(id, user.id)
  }

  @ApiOperation({
    summary: 'Concluir desafio',
    description:
      'Marca o desafio como concluído e concede XP e moedas ao Hunter. ' +
      'Requer que o Hunter tenha registrado ao menos uma atividade do tipo exigido ' +
      'após a inscrição no desafio.',
  })
  @ApiParam({ name: 'id', description: 'UUID do desafio.' })
  @ApiResponse({
    status: 200,
    description: 'Desafio concluído. Retorna XP e moedas ganhos.',
  })
  @ApiResponse({
    status: 400,
    description: 'Nenhuma atividade qualificante encontrada após a inscrição.',
  })
  @ApiResponse({ status: 404, description: 'Inscrição ativa não encontrada.' })
  @Patch(':id/complete')
  completeChallenge(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.challengesService.completeChallenge(id, user.id)
  }

  @ApiOperation({
    summary: 'Abandonar desafio',
    description: 'Marca a participação do Hunter no desafio como ABANDONED.',
  })
  @ApiParam({ name: 'id', description: 'UUID do desafio.' })
  @ApiResponse({ status: 200, description: 'Desafio abandonado.' })
  @ApiResponse({ status: 404, description: 'Inscrição ativa não encontrada.' })
  @Patch(':id/abandon')
  abandonChallenge(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.challengesService.abandonChallenge(id, user.id)
  }

  @ApiOperation({
    summary: 'Detalhes do desafio',
    description: 'Retorna os dados completos de um desafio pelo UUID.',
  })
  @ApiParam({ name: 'id', description: 'UUID do desafio.' })
  @ApiResponse({ status: 200, description: 'Dados do desafio.' })
  @ApiResponse({ status: 404, description: 'Desafio não encontrado.' })
  @Get(':id')
  getChallenge(@Param('id') id: string) {
    return this.challengesService.getChallenge(id)
  }

  @ApiOperation({
    summary: 'Deletar desafio',
    description:
      'Remove um desafio (admin only). Todas as participações ativas são marcadas como ABANDONED.',
  })
  @ApiParam({ name: 'id', description: 'UUID do desafio.' })
  @ApiResponse({ status: 200, description: 'Desafio deletado.' })
  @ApiResponse({ status: 404, description: 'Desafio não encontrado.' })
  @Delete(':id')
  deleteChallenge(@Param('id') id: string) {
    return this.challengesService.deleteChallenge(id)
  }
}
