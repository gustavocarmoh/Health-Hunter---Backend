import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { StoreService } from './store.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'

@ApiTags('store')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @ApiOperation({
    summary: 'Catálogo da loja',
    description: 'Retorna todos os itens disponíveis para compra na loja.',
  })
  @ApiResponse({ status: 200, description: 'Lista de itens.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('items')
  getItems() {
    return this.storeService.getItems()
  }

  @ApiOperation({
    summary: 'Comprar item',
    description:
      'Deduz moedas do Hunter e registra a posse do item. ' +
      'Retorna erro 409 se o item já for de propriedade do Hunter.',
  })
  @ApiResponse({ status: 201, description: 'Compra realizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Moedas insuficientes.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @ApiResponse({ status: 404, description: 'Item não encontrado.' })
  @ApiResponse({ status: 409, description: 'Item já adquirido.' })
  @Post('purchase')
  purchase(@CurrentUser() user: IUser, @Body() body: { item_id: string }) {
    return this.storeService.purchase(user.id, body.item_id)
  }

  @ApiOperation({
    summary: 'Inventário do Hunter',
    description: 'Retorna todos os itens adquiridos pelo Hunter autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Inventário do Hunter.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @Get('inventory')
  getInventory(@CurrentUser() user: IUser) {
    return this.storeService.getInventory(user.id)
  }
}
