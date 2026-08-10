import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { UserRepository } from '../../repositories/abstract/user.repository'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { Role } from '../../common/enums/role.enum'
import { HunterRank } from '../../common/enums/rank.enum'
import { LifestyleType } from '../../common/enums/lifestyle.enum'
import { IUser } from '../../common/interfaces/user.interface'
import { RedisService } from '../../cache/redis.service'

// Prefixo de blacklist — token revogado após uso ou logout
const REFRESH_BLACKLIST_PREFIX = 'refresh:blacklist:'
// TTL ligeiramente acima de 7 dias para cobrir o tempo até expiração natural
const REFRESH_BLACKLIST_TTL = 7 * 24 * 60 * 60 + 3600 // 7d + 1h

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Registra um novo Hunter no sistema.
   *
   * Verifica unicidade do e-mail, armazena senha com bcrypt (salt 12)
   * e cria a conta com Role `USER` e Rank `E` padrão.
   *
   * @param dto - Dados de registro (email, password, name)
   * @returns Par de tokens JWT: `access_token` (15 min) e `refresh_token` (7 dias)
   * @throws ConflictException se o e-mail já estiver cadastrado
   */
  async register(dto: RegisterDto): Promise<{ access_token: string; refresh_token: string }> {
    const existing = await this.userRepository.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException('Email already registered.')
    }

    const SALT_ROUNDS = 12
    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS)

    const user = await this.userRepository.create({
      email: dto.email,
      password_hash,
      name: dto.name,
      role: Role.USER,
      rank_level: HunterRank.E,
      xp: 0,
      coins: 0,
      stat_points_available: 0,
      strength: 0,
      intel: 0,
      vitality: 0,
      sense: 0,
      agility: 0,
      lifestyle: LifestyleType.CASUAL,
      region_state: '',
      region_country: '',
      city: '',
      is_deleted: false,
      anonymized_at: null,
    })

    return this.issueTokens(user)
  }

  /**
   * Autentica um Hunter com e-mail e senha.
   *
   * Contas marcadas como deletadas são rejeitadas com a mesma mensagem
   * de credenciais inválidas para evitar enumeração de usuários.
   *
   * @param dto - Credenciais de login (email, password)
   * @returns Par de tokens JWT
   * @throws UnauthorizedException se as credenciais forem inválidas
   */
  async login(dto: LoginDto): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.userRepository.findByEmail(dto.email)
    if (!user || user.is_deleted) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    return this.issueTokens(user)
  }

  /**
   * Renova a sessão utilizando um `refresh_token` válido.
   *
   * Verifica a assinatura com `JWT_REFRESH_SECRET` e o claim `type: 'refresh'`
   * antes de emitir novos tokens.
   *
   * @param refreshToken - Token de renovação emitido no login
   * @returns Novo par de tokens JWT
   * @throws UnauthorizedException se o token for inválido, expirado ou de tipo errado
   */
  async refreshToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const payload = this.jwtService.verify<{
        sub: string
        email: string
        role: string
        type: string
        jti: string
      }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'changeme-refresh-secret'),
      })

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type.')
      }

      // Verifica se o token já foi usado (rotation) ou revogado (logout)
      const blacklistKey = `${REFRESH_BLACKLIST_PREFIX}${payload.jti}`
      const revoked = await this.redisService.get<boolean>(blacklistKey)
      if (revoked) {
        throw new UnauthorizedException('Token already used or revoked.')
      }

      const user = await this.userRepository.findById(payload.sub)
      if (!user || user.is_deleted) {
        throw new UnauthorizedException('User not found.')
      }

      // Invalida o token atual antes de emitir o novo (rotation)
      await this.redisService.set(blacklistKey, true, REFRESH_BLACKLIST_TTL)

      return this.issueTokens(user)
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('Invalid or expired refresh token.')
    }
  }

  /**
   * Encerra a sessão do Hunter revogando o refresh token ativo.
   *
   * @param refreshToken - Token de renovação a ser revogado
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<{ jti: string }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'changeme-refresh-secret'),
      })
      const blacklistKey = `${REFRESH_BLACKLIST_PREFIX}${payload.jti}`
      await this.redisService.set(blacklistKey, true, REFRESH_BLACKLIST_TTL)
    } catch {
      // Token já expirado ou inválido: logout silencioso (idempotente)
    }
  }

  /**
   * Retorna os dados públicos do Hunter a partir do objeto JWT descodificado.
   *
   * Remove o campo `password_hash` antes de retornar.
   *
   * @param user - Payload do JWT injetado pelo `JwtAuthGuard`
   * @returns Perfil do Hunter sem dados sensíveis
   */
  getProfile(user: IUser): Omit<IUser, 'password_hash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _pw, ...profile } = user
    return profile
  }

  /**
   * Emite um par de tokens JWT assinados para o usuário informado.
   *
   * - `access_token`: asssinado com `JWT_SECRET`, expira em 15 minutos
   * - `refresh_token`: assinado com `JWT_REFRESH_SECRET`, expira em 7 dias,
   *   inclui claim `type: 'refresh'` para distinção de tokens
   *
   * @param user - Entidade do usuário autenticado
   * @returns Par de tokens JWT
   */
  private issueTokens(user: IUser): {
    access_token: string
    refresh_token: string
  } {
    const payload = { sub: user.id, email: user.email, role: user.role }

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'changeme-super-secret'),
      expiresIn: '15m',
    })

    const refresh_token = this.jwtService.sign(
      { ...payload, type: 'refresh', jti: randomUUID() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'changeme-refresh-secret'),
        expiresIn: '7d',
      },
    )

    return { access_token, refresh_token }
  }
}
