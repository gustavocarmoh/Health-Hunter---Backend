import { jest } from '@jest/globals'
import { JwtStrategy } from './jwt.strategy.js'
import { ConfigService } from '@nestjs/config'
import { UserRepository } from '../../../repositories/abstract/user.repository.js'
import { Role } from '../../../common/enums/role.enum.js'
import { HunterRank } from '../../../common/enums/rank.enum.js'
import { LifestyleType } from '../../../common/enums/lifestyle.enum.js'
import { IUser } from '../../../common/interfaces/user.interface.js'

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

describe('JwtStrategy', () => {
  let strategy: JwtStrategy
  let userRepository: { findById: jest.Mock<(...args: unknown[]) => Promise<unknown>> }
  let configService: { get: jest.Mock<(...args: unknown[]) => unknown> }

  beforeEach(() => {
    userRepository = { findById: jest.fn() }
    configService = { get: jest.fn().mockReturnValue('test-secret') }
    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      userRepository as unknown as UserRepository,
    )
  })

  it('should return the user when the payload subject exists and is active', async () => {
    userRepository.findById.mockResolvedValue(mockUser)

    const result = await strategy.validate({ sub: 'user-1', email: 'jin@hunter.com', role: 'USER' })

    expect(userRepository.findById).toHaveBeenCalledWith('user-1')
    expect(result).toBe(mockUser)
  })

  it('should throw when the user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null)

    await expect(
      strategy.validate({ sub: 'ghost', email: 'x@y.com', role: 'USER' }),
    ).rejects.toThrow('Unauthorized')
  })

  it('should throw when the user account was deleted', async () => {
    userRepository.findById.mockResolvedValue({ ...mockUser, is_deleted: true })

    await expect(
      strategy.validate({ sub: 'user-1', email: 'jin@hunter.com', role: 'USER' }),
    ).rejects.toThrow('Unauthorized')
  })
})
