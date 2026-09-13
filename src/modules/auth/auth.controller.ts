import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common'
import { Throttle } from '../../common/rate-limit/rate-limit.decorator.js'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service.js'
import { RegisterDto } from './dto/register.dto.js'
import { LoginDto } from './dto/login.dto.js'
import { RefreshTokenDto } from './dto/refresh-token.dto.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { IUser } from '../../common/interfaces/user.interface.js'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Registrar novo Hunter',
    description:
      'Cria uma nova conta de caçador com Role `USER` e Rank `E` automáticos. ' +
      'A senha é armazenada com bcrypt (salt 12).',
  })
  @ApiResponse({
    status: 201,
    description: 'Hunter registrado. Retorna par de tokens JWT.',
  })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  @ApiResponse({
    status: 422,
    description: 'Payload inválido (validação de campos).',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit excedido (máx. 10 registros/min).',
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @ApiOperation({
    summary: 'Login',
    description: 'Valida credenciais e emite `access_token` (15 min) + `refresh_token` (7 dias).',
  })
  @ApiResponse({
    status: 200,
    description: 'Login bem-sucedido. Retorna par de tokens JWT.',
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({
    status: 429,
    description: 'Rate limit excedido (máx. 5 tentativas/min).',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @ApiOperation({
    summary: 'Renovar sessão',
    description: 'Emite um novo par de tokens usando o `refresh_token` ainda válido.',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados com sucesso.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido ou expirado.',
  })
  @Post('refresh-token')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token)
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Perfil atual',
    description: 'Retorna os dados básicos do Hunter extraídos do JWT ativo.',
  })
  @ApiResponse({ status: 200, description: 'Dados do Hunter autenticado.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: IUser) {
    return this.authService.getProfile(user)
  }

  @ApiOperation({
    summary: 'Logout',
    description: 'Revoga o refresh token, impedindo que seja reutilizado.',
  })
  @ApiResponse({ status: 204, description: 'Logout realizado com sucesso.' })
  @HttpCode(204)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refresh_token)
  }
}
