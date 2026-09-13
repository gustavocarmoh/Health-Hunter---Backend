import { Controller, Post, UseGuards, Logger, Get, Body, Param, Patch } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { MissionsService } from './missions.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { RolesGuard } from '../../common/guards/roles.guard.js'
import { Roles } from '../../common/decorators/roles.decorator.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'
import { Role } from '../../common/enums/role.enum.js'

const logger = new Logger('MissionsController')

@ApiTags('missions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {
    logger.log('✓ MissionsController initialized')
  }

  @ApiOperation({
    summary: 'Listar missões do usuário',
    description:
      'Retorna todas as missões do usuário autenticado, incluindo diárias e individuais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de missões do usuário.',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado.',
  })
  @Get()
  @UseGuards(JwtAuthGuard)
  async listMissions(@CurrentUser() user: IUser) {
    return this.missionsService.getMissionsForUser(user.id)
  }

  @ApiOperation({
    summary: 'Gerar missões diárias',
    description: 'Gera 3-5 missões diárias aleatórias para o hunter autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Missões diárias geradas.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          difficulty: { type: 'string' },
          xp: { type: 'number' },
          icon: { type: 'string' },
          done: { type: 'boolean' },
          daily: { type: 'boolean' },
        },
      },
    },
  })
  @Post('generate-daily')
  async generateDaily(@CurrentUser() user: IUser) {
    return this.missionsService.generateDaily(user.id)
  }

  @ApiOperation({
    summary: 'Criar missão individual (Admin)',
    description: 'Cria uma missão individual para um hunter específico. Requer Role ADMIN.',
  })
  @ApiResponse({
    status: 201,
    description: 'Missão individual criada.',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado — requer Role ADMIN.' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':userId/individual')
  async createIndividualMission(
    @Param('userId') userId: string,
    @Body() body: { name: string; category: string; difficulty: string; xp: number; icon?: string },
  ) {
    return this.missionsService.createIndividual(userId, body)
  }

  @ApiOperation({
    summary: 'Marcar missão como concluída/não concluída',
    description: 'Atualiza o status de conclusão de uma missão do usuário.',
  })
  @ApiResponse({ status: 200, description: 'Missão atualizada.' })
  @ApiResponse({ status: 404, description: 'Missão não encontrada.' })
  @Patch(':id/done')
  async updateMissionDone(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() body: { done: boolean },
  ) {
    return this.missionsService.updateMissionDone(user.id, id, body.done)
  }
}
