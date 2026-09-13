import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { AchievementsService } from './achievements.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'

@ApiTags('achievements')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @ApiOperation({
    summary: 'Catálogo de conquistas',
    description:
      'Lista todas as conquistas disponíveis no sistema com seus critérios de desbloqueio.',
  })
  @ApiResponse({ status: 200, description: 'Catálogo de conquistas.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get()
  getCatalog() {
    return this.achievementsService.getCatalog()
  }

  @ApiOperation({
    summary: 'Minhas conquistas',
    description:
      'Lista todas as conquistas com o campo `is_unlocked` calculado dinamicamente ' +
      'com base nas estatísticas do Hunter autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conquistas com status de desbloqueio.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Hunter não encontrado.' })
  @Get('mine')
  getMyAchievements(@CurrentUser() user: IUser) {
    return this.achievementsService.getMyAchievements(user.id)
  }
}
