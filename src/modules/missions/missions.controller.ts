import { Controller, Post, UseGuards, Logger, Get, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { MissionsService } from './missions.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IUser } from '../../common/interfaces/user.interface'
import { Role } from '../../common/enums/role.enum'

const logger = new Logger('MissionsController')

@ApiTags('missions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {
    logger.log('✓ MissionsController initialized')
  }

  @Get()
  async listMissions() {
    return { message: 'Missions endpoint is accessible', version: '1.0.0' }
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
}
