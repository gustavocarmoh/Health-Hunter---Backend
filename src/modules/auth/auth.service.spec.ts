import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import bcrypt from 'bcrypt'
import { AuthService } from './auth.service.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { RedisService } from '../../cache/redis.service.js'
import { Role } from '../../common/enums/role.enum.js'
import { HunterRank } from '../../common/enums/rank.enum.js'
import { LifestyleType } from '../../common/enums/lifestyle.enum.js'
import { IUser } from '../../common/interfaces/user.interface.js'

const mockUser: IUser = {
  id: 'user-abc',
  email: 'jin@hunter.com',
  password_hash: '$2b$12$hashedpw',
  name: 'Sung Jin-Woo',
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
  region_state: 'SP',
  region_country: 'BR',
  city: 'São Paulo',
  is_deleted: false,
  anonymized_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockUserRepository = {
  findByEmail: asyncMock(),
  findById: asyncMock(),
  create: asyncMock(),
  update: asyncMock(),
}

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
}

const mockConfigService = {
  get: jest.fn((key: string, fallback?: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    }
    return map[key] ?? fallback
  }),
}

const mockRedisService = {
  get: asyncMock(),
  set: asyncMock(),
  del: asyncMock(),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()

    // Default token stubs
    mockJwtService.sign.mockReturnValue('signed-token')
  })

  // ─── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should hash the password and return access/refresh tokens', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)
      mockUserRepository.create.mockResolvedValue(mockUser)

      const result = await service.register({
        email: 'jin@hunter.com',
        password: 'S3cur3P@ss',
        name: 'Sung Jin-Woo',
      })

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('jin@hunter.com')
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jin@hunter.com',
          name: 'Sung Jin-Woo',
          role: Role.USER,
          rank_level: HunterRank.E,
        }),
      )
      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('refresh_token')
    })

    it('should throw ConflictException when email is already registered', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)

      await expect(
        service.register({
          email: 'jin@hunter.com',
          password: 'S3cur3P@ss',
          name: 'Sung Jin-Woo',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)

      const result = await service.login({
        email: 'jin@hunter.com',
        password: 'S3cur3P@ss',
      })

      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('refresh_token')
    })

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)

      await expect(service.login({ email: 'ghost@hunter.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when account is deleted', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        is_deleted: true,
      })

      await expect(service.login({ email: 'jin@hunter.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when password is wrong', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never)
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)

      await expect(
        service.login({ email: 'jin@hunter.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('should return a generic error message to prevent user enumeration', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null)

      await expect(
        service.login({ email: 'ghost@hunter.com', password: 'pass' }),
      ).rejects.toMatchObject({ message: 'Invalid credentials.' })
    })
  })

  // ─── refreshToken ────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    const refreshPayload = {
      sub: 'user-abc',
      email: 'jin@hunter.com',
      role: Role.USER,
      type: 'refresh',
      jti: 'jti-123',
    }

    it('should issue new tokens when refresh token is valid', async () => {
      mockJwtService.verify.mockReturnValue(refreshPayload)
      mockRedisService.get.mockResolvedValue(null) // not blacklisted
      mockUserRepository.findById.mockResolvedValue(mockUser)
      mockRedisService.set.mockResolvedValue(undefined)

      const result = await service.refreshToken('valid-refresh-token')

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `refresh:blacklist:${refreshPayload.jti}`,
        true,
        expect.any(Number),
      )
      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('refresh_token')
    })

    it('should throw UnauthorizedException when token is already revoked', async () => {
      mockJwtService.verify.mockReturnValue(refreshPayload)
      mockRedisService.get.mockResolvedValue(true) // blacklisted

      await expect(service.refreshToken('used-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      mockJwtService.verify.mockReturnValue({ ...refreshPayload, type: 'access' })
      mockRedisService.get.mockResolvedValue(null)

      await expect(service.refreshToken('access-token-used-as-refresh')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when user no longer exists', async () => {
      mockJwtService.verify.mockReturnValue(refreshPayload)
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(service.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when jwt.verify throws', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired')
      })

      await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException)
    })
  })

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should blacklist the jti of the provided refresh token', async () => {
      mockJwtService.verify.mockReturnValue({ jti: 'jti-456' })
      mockRedisService.set.mockResolvedValue(undefined)

      await service.logout('valid-refresh-token')

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'refresh:blacklist:jti-456',
        true,
        expect.any(Number),
      )
    })

    it('should silently succeed when token is already expired or invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired')
      })

      // Should not throw
      await expect(service.logout('expired-token')).resolves.toBeUndefined()
    })
  })

  // ─── getProfile ───────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return user data without password_hash', () => {
      const profile = service.getProfile(mockUser)

      expect(profile).not.toHaveProperty('password_hash')
      expect(profile).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      })
    })
  })
})
