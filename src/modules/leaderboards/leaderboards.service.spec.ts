import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { LeaderboardsService } from './leaderboards.service'
import { UserRepository } from '../../repositories/abstract/user.repository'
import { FollowRepository } from '../../repositories/abstract/follow.repository'
import { RedisService } from '../../cache/redis.service'
import { Role } from '../../common/enums/role.enum'
import { HunterRank } from '../../common/enums/rank.enum'
import { LifestyleType } from '../../common/enums/lifestyle.enum'
import { IUser } from '../../common/interfaces/user.interface'

const buildUser = (overrides: Partial<IUser> = {}): IUser => ({
  id: 'user-001',
  email: 'hunter@test.com',
  password_hash: 'hashed',
  name: 'Shadow Monarch',
  role: Role.USER,
  rank_level: HunterRank.S,
  xp: 120000,
  coins: 60000,
  lifestyle: LifestyleType.HARDCORE,
  region_state: 'SP',
  region_country: 'BR',
  city: 'São Paulo',
  is_deleted: false,
  anonymized_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
})

const topUsers = [
  buildUser({ id: 'u1', xp: 200000 }),
  buildUser({ id: 'u2', xp: 150000 }),
  buildUser({ id: 'u3', xp: 120000 }),
]

const mockUserRepository = {
  findLeaderboard: jest.fn(),
  findLeaderboardCursor: jest.fn(),
  findById: jest.fn(),
  countWithMoreXp: jest.fn(),
  findByIds: jest.fn(),
}

const mockFollowRepository = {
  findFollowingIds: jest.fn(),
}

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
}

describe('LeaderboardsService', () => {
  let service: LeaderboardsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardsService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: FollowRepository, useValue: mockFollowRepository },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile()

    service = module.get<LeaderboardsService>(LeaderboardsService)
    jest.clearAllMocks()
  })

  // ─── getGlobal ────────────────────────────────────────────────────────────

  describe('getGlobal', () => {
    it('should return leaderboard from DB and cache the result on miss', async () => {
      mockRedisService.get.mockResolvedValue(null) // cache miss
      mockUserRepository.findLeaderboard.mockResolvedValue(topUsers)
      mockRedisService.set.mockResolvedValue(undefined)

      const result = (await service.getGlobal()) as {
        scope: string
        leaderboard: { position: number }[]
      }

      expect(mockUserRepository.findLeaderboard).toHaveBeenCalledTimes(1)
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'leaderboard:global',
        expect.objectContaining({ scope: 'global' }),
        300,
      )
      expect(result).toMatchObject({ scope: 'global' })
      expect(result.leaderboard[0].position).toBe(1)
    })

    it('should return cached data without hitting the DB on cache hit', async () => {
      const cached = { scope: 'global', leaderboard: [] }
      mockRedisService.get.mockResolvedValue(cached)

      const result = await service.getGlobal()

      expect(mockUserRepository.findLeaderboard).not.toHaveBeenCalled()
      expect(result).toEqual(cached)
    })

    it('should number positions starting at 1', async () => {
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findLeaderboard.mockResolvedValue(topUsers)
      mockRedisService.set.mockResolvedValue(undefined)

      const { leaderboard } = (await service.getGlobal()) as { leaderboard: { position: number }[] }

      leaderboard.forEach((entry: { position: number }, idx: number) => {
        expect(entry.position).toBe(idx + 1)
      })
    })
  })

  // ─── getRegional ─────────────────────────────────────────────────────────

  describe('getRegional', () => {
    it('should filter by state and country and cache the result', async () => {
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findLeaderboard.mockResolvedValue(topUsers)
      mockRedisService.set.mockResolvedValue(undefined)

      const result = await service.getRegional('SP', 'BR')

      expect(mockUserRepository.findLeaderboard).toHaveBeenCalledWith(
        { region_state: 'SP', region_country: 'BR' },
        100,
      )
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'leaderboard:regional:SP:BR',
        expect.any(Object),
        300,
      )
      expect(result).toMatchObject({
        scope: 'regional',
        filters: { state: 'SP', country: 'BR' },
      })
    })

    it('should serve from cache on hit', async () => {
      const cached = { scope: 'regional', filters: {}, leaderboard: [] }
      mockRedisService.get.mockResolvedValue(cached)

      const result = await service.getRegional('SP', 'BR')

      expect(mockUserRepository.findLeaderboard).not.toHaveBeenCalled()
      expect(result).toEqual(cached)
    })
  })

  // ─── getLocal ─────────────────────────────────────────────────────────────

  describe('getLocal', () => {
    it('should filter by city and state and cache the result', async () => {
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findLeaderboard.mockResolvedValue(topUsers)
      mockRedisService.set.mockResolvedValue(undefined)

      const result = await service.getLocal('São Paulo', 'SP')

      expect(mockUserRepository.findLeaderboard).toHaveBeenCalledWith(
        { city: 'São Paulo', region_state: 'SP' },
        100,
      )
      expect(result).toMatchObject({
        scope: 'local',
        filters: { city: 'São Paulo', state: 'SP' },
      })
    })
  })

  // ─── getMyPosition ────────────────────────────────────────────────────────

  describe('getMyPosition', () => {
    it('should return global, regional and local positions for the hunter', async () => {
      const user = buildUser({ xp: 50000 })
      mockUserRepository.findById.mockResolvedValue(user)
      // countWithMoreXp returns how many hunters have more XP
      mockUserRepository.countWithMoreXp
        .mockResolvedValueOnce(9) // global: 10th place
        .mockResolvedValueOnce(2) // regional: 3rd place
        .mockResolvedValueOnce(0) // local: 1st place

      const result = await service.getMyPosition('user-001')

      expect(result).toMatchObject({
        hunter_id: 'user-001',
        xp: 50000,
        positions: { global: 10, regional: 3, local: 1 },
      })
    })

    it('should throw NotFoundException when hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(service.getMyPosition('ghost-id')).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when account is deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser({ is_deleted: true }))

      await expect(service.getMyPosition('user-001')).rejects.toThrow(NotFoundException)
    })
  })

  // ─── getFriendsLeaderboard ────────────────────────────────────────────────

  describe('getFriendsLeaderboard', () => {
    it('should return empty result when hunter follows nobody', async () => {
      mockFollowRepository.findFollowingIds.mockResolvedValue([])

      const result = await service.getFriendsLeaderboard('user-001')

      expect(result).toEqual({ total: 0, leaderboard: [] })
      expect(mockUserRepository.findByIds).not.toHaveBeenCalled()
    })

    it('should return sorted friends leaderboard', async () => {
      mockFollowRepository.findFollowingIds.mockResolvedValue(['u1', 'u2'])
      mockUserRepository.findByIds.mockResolvedValue([
        buildUser({ id: 'u2', xp: 150000 }),
        buildUser({ id: 'u1', xp: 200000 }),
      ])

      const result = await service.getFriendsLeaderboard('user-001')

      expect(result.leaderboard[0].xp).toBeGreaterThanOrEqual(result.leaderboard[1]?.xp ?? 0)
    })
  })
})
