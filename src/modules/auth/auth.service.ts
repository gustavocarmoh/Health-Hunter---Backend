import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { RegisterDto } from './dto/register.dto.js'
import { LoginDto } from './dto/login.dto.js'
import { Role } from '../../common/enums/role.enum.js'
import { HunterRank } from '../../common/enums/rank.enum.js'
import { LifestyleType } from '../../common/enums/lifestyle.enum.js'
import { IUser } from '../../common/interfaces/user.interface.js'
import { RedisService } from '../../cache/redis.service.js'

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

  async login(dto: LoginDto): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.userRepository.findByEmail(dto.email)
    // Mesma mensagem para conta deletada e senha errada, para evitar enumeração de usuários.
    if (!user || user.is_deleted) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    return this.issueTokens(user)
  }

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

  getProfile(user: IUser): Omit<IUser, 'password_hash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _pw, ...profile } = user
    return profile
  }

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
