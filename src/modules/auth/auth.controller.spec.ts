import { jest } from '@jest/globals'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { Role } from '../../common/enums/role.enum.js'
import { HunterRank } from '../../common/enums/rank.enum.js'
import { LifestyleType } from '../../common/enums/lifestyle.enum.js'
import { IUser } from '../../common/interfaces/user.interface.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockUser: IUser = {
  id: 'user-1',
  email: 'jin@hunter.com',
  password_hash: 'hashed',
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
  created_at: new Date(),
  updated_at: new Date(),
}

describe('AuthController', () => {
  let controller: AuthController
  let authService: {
    register: jest.Mock<(...args: unknown[]) => Promise<unknown>>
    login: jest.Mock<(...args: unknown[]) => Promise<unknown>>
    refreshToken: jest.Mock<(...args: unknown[]) => Promise<unknown>>
    getProfile: jest.Mock<(...args: unknown[]) => Promise<unknown>>
    logout: jest.Mock<(...args: unknown[]) => Promise<unknown>>
  }

  beforeEach(() => {
    authService = {
      register: asyncMock(),
      login: asyncMock(),
      refreshToken: asyncMock(),
      getProfile: asyncMock(),
      logout: asyncMock(),
    }
    controller = new AuthController(authService as unknown as AuthService)
  })

  it('should delegate register to the service', async () => {
    const dto = { email: 'a@b.com', password: 'S3cur3P@ss', name: 'Jin' }
    authService.register.mockResolvedValue({ access_token: 't', refresh_token: 'r' })

    const result = await controller.register(dto as never)

    expect(authService.register).toHaveBeenCalledWith(dto)
    expect(result).toEqual({ access_token: 't', refresh_token: 'r' })
  })

  it('should delegate login to the service', async () => {
    const dto = { email: 'a@b.com', password: 'S3cur3P@ss' }
    authService.login.mockResolvedValue({ access_token: 't', refresh_token: 'r' })

    const result = await controller.login(dto as never)

    expect(authService.login).toHaveBeenCalledWith(dto)
    expect(result).toEqual({ access_token: 't', refresh_token: 'r' })
  })

  it('should delegate refreshToken to the service', async () => {
    authService.refreshToken.mockResolvedValue({ access_token: 't2', refresh_token: 'r2' })

    const result = await controller.refreshToken({ refresh_token: 'old' } as never)

    expect(authService.refreshToken).toHaveBeenCalledWith('old')
    expect(result).toEqual({ access_token: 't2', refresh_token: 'r2' })
  })

  it('should return the current user profile', async () => {
    authService.getProfile.mockResolvedValue(mockUser)

    const result = await controller.getMe(mockUser)

    expect(authService.getProfile).toHaveBeenCalledWith(mockUser)
    expect(result).toBe(mockUser)
  })

  it('should delegate logout to the service', async () => {
    authService.logout.mockResolvedValue(undefined)

    await controller.logout({ refresh_token: 'old' } as never)

    expect(authService.logout).toHaveBeenCalledWith('old')
  })
})
