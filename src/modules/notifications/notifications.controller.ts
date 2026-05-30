import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IUser } from '../../common/interfaces/user.interface'

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({
    summary: 'Minhas notificações',
    description:
      'Lista as notificações do Hunter autenticado, paginadas e ordenadas da mais recente para a mais antiga.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista paginada de notificações.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get()
  getMyNotifications(
    @CurrentUser() user: IUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getMyNotifications(user.id, Number(page), Number(limit))
  }

  @ApiOperation({
    summary: 'Marcar todas como lidas',
    description: 'Marca todas as notificações não lidas do Hunter autenticado como lidas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificações marcadas como lidas.',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Patch('read-all')
  markAllRead(@CurrentUser() user: IUser) {
    return this.notificationsService.markAllRead(user.id)
  }

  @ApiOperation({
    summary: 'Marcar notificação como lida',
    description: 'Marca uma notificação específica do Hunter autenticado como lida.',
  })
  @ApiParam({ name: 'id', description: 'UUID da notificação.' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Patch(':id/read')
  markOneRead(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.notificationsService.markOneRead(id, user.id)
  }

  @ApiOperation({
    summary: 'Limpar todas as notificações',
    description: 'Remove permanentemente todas as notificações do Hunter autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Notificações removidas.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Delete()
  clearAll(@CurrentUser() user: IUser) {
    return this.notificationsService.clearAll(user.id)
  }
}
