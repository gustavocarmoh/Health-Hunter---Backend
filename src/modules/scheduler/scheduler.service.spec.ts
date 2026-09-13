import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import { SchedulerService } from './scheduler.service.js'
import { RedisService } from '../../cache/redis.service.js'
import { RankEngineService } from '../../common/rank/rank-engine.service.js'
import { GuildInviteRepository } from '../../repositories/abstract/guild-invite.repository.js'
import { SeasonRepository } from '../../repositories/abstract/season.repository.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockRedisService = { invalidatePattern: asyncMock() }
const mockRankEngineService = { runWeeklyDecay: asyncMock() }
const mockGuildInviteRepository = { expireOld: asyncMock() }
const mockSeasonRepository = {}
const mockDataSource = { query: asyncMock() }

describe('SchedulerService', () => {
  let service: SchedulerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: RankEngineService, useValue: mockRankEngineService },
        { provide: GuildInviteRepository, useValue: mockGuildInviteRepository },
        { provide: SeasonRepository, useValue: mockSeasonRepository },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile()

    service = module.get<SchedulerService>(SchedulerService)
    jest.clearAllMocks()
  })

  describe('resetLeaderboardCache', () => {
    it('should invalidate the leaderboard cache pattern', async () => {
      mockRedisService.invalidatePattern.mockResolvedValue(undefined)
      await service.resetLeaderboardCache()
      expect(mockRedisService.invalidatePattern).toHaveBeenCalledWith('leaderboard:*')
    })
  })

  describe('closeExpiredEvents', () => {
    it('should close expired events', async () => {
      mockDataSource.query.mockResolvedValue([[], 3])
      await expect(service.closeExpiredEvents()).resolves.toBeUndefined()
    })

    it('should swallow errors from the query', async () => {
      mockDataSource.query.mockRejectedValue(new Error('db down'))
      await expect(service.closeExpiredEvents()).resolves.toBeUndefined()
    })
  })

  describe('cleanupAuditLogs', () => {
    it('should delete old soft-deleted hunters', async () => {
      mockDataSource.query.mockResolvedValue([[], 1])
      await expect(service.cleanupAuditLogs()).resolves.toBeUndefined()
    })

    it('should swallow errors from the query', async () => {
      mockDataSource.query.mockRejectedValue(new Error('db down'))
      await expect(service.cleanupAuditLogs()).resolves.toBeUndefined()
    })
  })

  describe('runRankDecay', () => {
    it('should run the weekly rank decay', async () => {
      mockRankEngineService.runWeeklyDecay.mockResolvedValue({
        xp_decayed: 2,
        demoted: 1,
        demoted_ids: ['u1'],
      })
      await expect(service.runRankDecay()).resolves.toBeUndefined()
    })

    it('should swallow errors from the rank engine', async () => {
      mockRankEngineService.runWeeklyDecay.mockRejectedValue(new Error('boom'))
      await expect(service.runRankDecay()).resolves.toBeUndefined()
    })
  })

  describe('expireGuildInvites', () => {
    it('should expire old guild invites', async () => {
      mockGuildInviteRepository.expireOld.mockResolvedValue(undefined)
      await expect(service.expireGuildInvites()).resolves.toBeUndefined()
    })

    it('should swallow errors from the repository', async () => {
      mockGuildInviteRepository.expireOld.mockRejectedValue(new Error('boom'))
      await expect(service.expireGuildInvites()).resolves.toBeUndefined()
    })
  })

  describe('autoEndExpiredSeasons', () => {
    it('should do nothing when there are no expired seasons', async () => {
      mockDataSource.query.mockResolvedValueOnce([])
      await expect(service.autoEndExpiredSeasons()).resolves.toBeUndefined()
    })

    it('should deactivate each expired season', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 's1', title: 'Season One' }])
        .mockResolvedValueOnce(undefined)

      await service.autoEndExpiredSeasons()

      expect(mockDataSource.query).toHaveBeenCalledTimes(2)
    })

    it('should swallow errors from the query', async () => {
      mockDataSource.query.mockRejectedValue(new Error('boom'))
      await expect(service.autoEndExpiredSeasons()).resolves.toBeUndefined()
    })
  })
})
