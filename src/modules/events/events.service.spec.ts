import { jest } from '@jest/globals'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { EventsService } from './events.service.js'
import { EventRepository } from '../../repositories/abstract/event.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { RedisService } from '../../cache/redis.service.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockEventRepository = {
  findAllActive: asyncMock(),
  findById: asyncMock(),
  isUserJoined: asyncMock(),
  joinEvent: asyncMock(),
  leaveEvent: asyncMock(),
  findByUserId: asyncMock(),
  getLeaderboard: asyncMock(),
}
const mockUserRepository = { findById: asyncMock() }
const mockRedisService = { get: asyncMock(), set: asyncMock(), del: asyncMock() }

const event = { id: 'event-1', title: 'Raid', is_active: true, region_filter: null }

describe('EventsService', () => {
  let service: EventsService

  beforeEach(() => {
    service = new EventsService(
      mockEventRepository as unknown as EventRepository,
      mockUserRepository as unknown as UserRepository,
      mockRedisService as unknown as RedisService,
    )
    jest.clearAllMocks()
  })

  describe('getActiveEvents', () => {
    it('should fetch and cache active events on a cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue({ region_state: 'SP' })
      mockEventRepository.findAllActive.mockResolvedValue([event])
      mockRedisService.set.mockResolvedValue(undefined)

      const result = await service.getActiveEvents('user-1')

      expect(mockRedisService.set).toHaveBeenCalledWith('events:active', [event], 60)
      expect(result).toEqual([event])
    })

    it('should use cached events without hitting the repository', async () => {
      mockRedisService.get.mockResolvedValue([event])
      mockUserRepository.findById.mockResolvedValue({ region_state: 'SP' })

      const result = await service.getActiveEvents('user-1')

      expect(mockEventRepository.findAllActive).not.toHaveBeenCalled()
      expect(result).toEqual([event])
    })

    it('should filter out events restricted to a different region', async () => {
      mockRedisService.get.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue({ region_state: 'RJ' })
      mockEventRepository.findAllActive.mockResolvedValue([{ ...event, region_filter: 'SP' }])

      const result = await service.getActiveEvents('user-1')

      expect(result).toEqual([])
    })
  })

  describe('joinEvent', () => {
    it('should throw NotFoundException when the event is missing or inactive', async () => {
      mockEventRepository.findById.mockResolvedValue(null)
      await expect(service.joinEvent('event-1', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ConflictException when already joined', async () => {
      mockEventRepository.findById.mockResolvedValue(event)
      mockEventRepository.isUserJoined.mockResolvedValue(true)
      await expect(service.joinEvent('event-1', 'user-1')).rejects.toThrow(ConflictException)
    })

    it('should join and invalidate the active-events cache', async () => {
      mockEventRepository.findById.mockResolvedValue(event)
      mockEventRepository.isUserJoined.mockResolvedValue(false)
      mockEventRepository.joinEvent.mockResolvedValue({ id: 'participant-1' })
      mockRedisService.del.mockResolvedValue(undefined)

      const result = await service.joinEvent('event-1', 'user-1')

      expect(mockRedisService.del).toHaveBeenCalledWith('events:active')
      expect(result).toEqual({ id: 'participant-1' })
    })
  })

  describe('getEvent', () => {
    it('should throw NotFoundException when missing', async () => {
      mockEventRepository.findById.mockResolvedValue(null)
      await expect(service.getEvent('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the event', async () => {
      mockEventRepository.findById.mockResolvedValue(event)
      await expect(service.getEvent('event-1')).resolves.toBe(event)
    })
  })

  describe('getMyEvents', () => {
    it('should return the events the hunter is enrolled in', async () => {
      mockEventRepository.findByUserId.mockResolvedValue([event])
      await expect(service.getMyEvents('user-1')).resolves.toEqual({ total: 1, events: [event] })
    })
  })

  describe('leaveEvent', () => {
    it('should throw NotFoundException when the event does not exist', async () => {
      mockEventRepository.findById.mockResolvedValue(null)
      await expect(service.leaveEvent('event-1', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when the hunter is not enrolled', async () => {
      mockEventRepository.findById.mockResolvedValue(event)
      mockEventRepository.isUserJoined.mockResolvedValue(false)
      await expect(service.leaveEvent('event-1', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should leave the event and invalidate the cache', async () => {
      mockEventRepository.findById.mockResolvedValue(event)
      mockEventRepository.isUserJoined.mockResolvedValue(true)
      mockEventRepository.leaveEvent.mockResolvedValue(undefined)
      mockRedisService.del.mockResolvedValue(undefined)

      await expect(service.leaveEvent('event-1', 'user-1')).resolves.toEqual({
        message: 'Successfully left the event.',
      })
      expect(mockRedisService.del).toHaveBeenCalledWith('events:active')
    })
  })

  describe('getLeaderboard', () => {
    it('should throw NotFoundException when missing', async () => {
      mockEventRepository.findById.mockResolvedValue(null)
      await expect(service.getLeaderboard('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the event leaderboard', async () => {
      mockEventRepository.findById.mockResolvedValue(event)
      mockEventRepository.getLeaderboard.mockResolvedValue([{ user_id: 'u1', xp: 10 }])

      const result = await service.getLeaderboard('event-1')

      expect(result).toEqual({
        event_id: 'event-1',
        event_title: 'Raid',
        leaderboard: [{ user_id: 'u1', xp: 10 }],
      })
    })
  })
})
