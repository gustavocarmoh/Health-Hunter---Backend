import { jest } from '@jest/globals'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { AdminService } from './admin.service.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { AuditLogRepository } from '../../repositories/abstract/audit-log.repository.js'
import { ChallengeRepository } from '../../repositories/abstract/challenge.repository.js'
import { EventRepository } from '../../repositories/abstract/event.repository.js'
import { ActivityRepository } from '../../repositories/abstract/activity.repository.js'
import { AchievementRepository } from '../../repositories/abstract/achievement.repository.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockUserRepository = {
  findAll: asyncMock(),
  findById: asyncMock(),
  update: asyncMock(),
  delete: asyncMock(),
  countActive: asyncMock(),
  countNewSince: asyncMock(),
}
const mockAuditLogRepository = { create: asyncMock(), findAll: asyncMock() }
const mockChallengeRepository = {
  create: asyncMock(),
  findAll: asyncMock(),
  findById: asyncMock(),
  update: asyncMock(),
}
const mockEventRepository = {
  create: asyncMock(),
  findById: asyncMock(),
  update: asyncMock(),
  getParticipantsWithUsers: asyncMock(),
  countActive: asyncMock(),
  findAll: asyncMock(),
  delete: asyncMock(),
}
const mockActivityRepository = { countAll: asyncMock(), sumXpAll: asyncMock() }
const mockAchievementRepository = { create: asyncMock() }

const user = {
  id: 'user-1',
  name: 'Jin',
  email: 'jin@hunter.com',
  password_hash: 'x',
  role: 'USER',
  rank_level: 'C',
}

describe('AdminService', () => {
  let service: AdminService

  beforeEach(() => {
    service = new AdminService(
      mockUserRepository as unknown as UserRepository,
      mockAuditLogRepository as unknown as AuditLogRepository,
      mockChallengeRepository as unknown as ChallengeRepository,
      mockEventRepository as unknown as EventRepository,
      mockActivityRepository as unknown as ActivityRepository,
      mockAchievementRepository as unknown as AchievementRepository,
    )
    jest.clearAllMocks()
  })

  describe('getUsers', () => {
    it('should strip password_hash from all users', async () => {
      mockUserRepository.findAll.mockResolvedValue({ users: [user], total: 1 })

      const result = await service.getUsers(1, 20)

      expect(result.users[0]).not.toHaveProperty('password_hash')
    })

    it('should filter users by search term', async () => {
      mockUserRepository.findAll.mockResolvedValue({
        users: [user, { ...user, id: 'u2', name: 'Other', email: 'other@x.com' }],
        total: 2,
      })

      const result = await service.getUsers(1, 20, 'jin')

      expect(result.users).toHaveLength(1)
    })
  })

  describe('assignRole', () => {
    it('should throw NotFoundException when the user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(
        service.assignRole('ghost', 'admin-1', { role: 'ADMIN' } as never),
      ).rejects.toThrow(NotFoundException)
    })

    it('should update the role and write an audit log', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.update.mockResolvedValue(undefined)
      mockAuditLogRepository.create.mockResolvedValue(undefined)

      const result = await service.assignRole('user-1', 'admin-1', { role: 'ADMIN' } as never)

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ASSIGN_ROLE', old_value: 'USER', new_value: 'ADMIN' }),
      )
      expect(result.user_id).toBe('user-1')
    })
  })

  describe('assignRank', () => {
    it('should throw NotFoundException when the user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(
        service.assignRank('ghost', 'admin-1', { rank_level: 'S' } as never),
      ).rejects.toThrow(NotFoundException)
    })

    it('should update the rank and write an audit log', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.update.mockResolvedValue(undefined)
      mockAuditLogRepository.create.mockResolvedValue(undefined)

      const result = await service.assignRank('user-1', 'admin-1', { rank_level: 'S' } as never)

      expect(result.message).toContain('S')
    })
  })

  describe('createChallenge', () => {
    it('should throw BadRequestException when end_date is not after start_date', async () => {
      await expect(
        service.createChallenge({
          start_date: '2024-02-01',
          end_date: '2024-01-01',
        } as never),
      ).rejects.toThrow(BadRequestException)
    })

    it('should default is_active to true', async () => {
      mockChallengeRepository.create.mockResolvedValue({ id: 'ch-1', is_active: true })

      await service.createChallenge({ title: 'x' } as never)

      expect(mockChallengeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      )
    })
  })

  describe('getAuditLogs', () => {
    it('should return the paginated audit log', async () => {
      mockAuditLogRepository.findAll.mockResolvedValue({ total: 0, data: [] })
      await service.getAuditLogs(1, 20)
      expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(1, 20)
    })
  })

  describe('getStats', () => {
    it('should aggregate platform-wide stats', async () => {
      mockUserRepository.countActive.mockResolvedValue(10)
      mockUserRepository.countNewSince.mockResolvedValue(2)
      mockActivityRepository.countAll.mockResolvedValue(5)
      mockActivityRepository.sumXpAll.mockResolvedValue(500)
      mockEventRepository.countActive.mockResolvedValue(1)

      const result = await service.getStats()

      expect(result).toEqual({
        totalHunters: 10,
        newThisWeek: 2,
        activitiesToday: 5,
        xpToday: 500,
        activeEvents: 1,
      })
    })
  })

  describe('createEvent', () => {
    it('should throw BadRequestException when ends_at is not after starts_at', async () => {
      await expect(
        service.createEvent({ starts_at: '2024-02-01', ends_at: '2024-01-01' } as never, 'admin-1'),
      ).rejects.toThrow(BadRequestException)
    })

    it('should create the event and write an audit log', async () => {
      mockEventRepository.create.mockResolvedValue({ id: 'event-1' })
      mockAuditLogRepository.create.mockResolvedValue(undefined)

      const result = await service.createEvent(
        {
          title: 'Raid',
          description: 'd',
          type: 'RAID',
          starts_at: '2024-01-01',
          ends_at: '2024-02-01',
        } as never,
        'admin-1',
      )

      expect(result).toEqual({ id: 'event-1' })
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_EVENT' }),
      )
    })
  })

  describe('updateEvent', () => {
    const existing = {
      id: 'event-1',
      starts_at: new Date('2024-01-01'),
      ends_at: new Date('2024-02-01'),
    }

    it('should throw NotFoundException when the event does not exist', async () => {
      mockEventRepository.findById.mockResolvedValue(null)
      await expect(service.updateEvent('ghost', {} as never, 'admin-1')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw BadRequestException when the new dates are invalid', async () => {
      mockEventRepository.findById.mockResolvedValue(existing)
      await expect(
        service.updateEvent('event-1', { starts_at: '2024-03-01' } as never, 'admin-1'),
      ).rejects.toThrow(BadRequestException)
    })

    it('should update the event and write an audit log', async () => {
      mockEventRepository.findById.mockResolvedValue(existing)
      mockEventRepository.update.mockResolvedValue({ id: 'event-1', title: 'Updated' })
      mockAuditLogRepository.create.mockResolvedValue(undefined)

      const result = await service.updateEvent('event-1', { title: 'Updated' } as never, 'admin-1')

      expect(result).toEqual({ id: 'event-1', title: 'Updated' })
    })
  })

  describe('getEventParticipants', () => {
    it('should throw NotFoundException when the event does not exist', async () => {
      mockEventRepository.findById.mockResolvedValue(null)
      await expect(service.getEventParticipants('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the participant list', async () => {
      mockEventRepository.findById.mockResolvedValue({ id: 'event-1' })
      mockEventRepository.getParticipantsWithUsers.mockResolvedValue([{ user_id: 'u1' }])

      const result = await service.getEventParticipants('event-1')

      expect(result.total).toBe(1)
    })
  })

  describe('hardDeleteUser', () => {
    it('should throw NotFoundException when the user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.hardDeleteUser('ghost', 'admin-1')).rejects.toThrow(NotFoundException)
    })

    it('should permanently delete the user and write an audit log', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.delete.mockResolvedValue(undefined)
      mockAuditLogRepository.create.mockResolvedValue(undefined)

      const result = await service.hardDeleteUser('user-1', 'admin-1')

      expect(result.message).toContain('permanently deleted')
    })
  })

  describe('getAllEvents', () => {
    it('should return the paginated event list', async () => {
      mockEventRepository.findAll.mockResolvedValue({ total: 0, data: [] })
      await service.getAllEvents(1, 20)
      expect(mockEventRepository.findAll).toHaveBeenCalledWith(1, 20)
    })
  })

  describe('getAllChallenges', () => {
    it('should paginate the challenge list in memory', async () => {
      mockChallengeRepository.findAll.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({ id: `c${i}` })),
      )

      const result = await service.getAllChallenges(1, 2)

      expect(result.total).toBe(5)
      expect(result.challenges).toHaveLength(2)
    })
  })

  describe('updateChallenge', () => {
    it('should throw NotFoundException when missing', async () => {
      mockChallengeRepository.findById.mockResolvedValue(null)
      await expect(service.updateChallenge('ghost', {}, 'admin-1')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should update the challenge and write an audit log', async () => {
      mockChallengeRepository.findById.mockResolvedValue({ id: 'ch-1' })
      mockChallengeRepository.update.mockResolvedValue({ id: 'ch-1', title: 'New' })
      mockAuditLogRepository.create.mockResolvedValue(undefined)

      const result = await service.updateChallenge('ch-1', { title: 'New' }, 'admin-1')

      expect(result).toEqual({ id: 'ch-1', title: 'New' })
    })
  })

  describe('createAchievement', () => {
    it('should throw BadRequestException when required fields are missing', async () => {
      await expect(service.createAchievement({ title: 'x' })).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException for an invalid condition_type', async () => {
      await expect(
        service.createAchievement({
          title: 'x',
          description: 'd',
          condition_type: 'INVALID',
          condition_value: 1,
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should create the achievement with defaults', async () => {
      mockAchievementRepository.create.mockResolvedValue({ id: 'a1' })

      const result = await service.createAchievement({
        title: 'x',
        description: 'd',
        condition_type: 'ACTIVITIES_COUNT',
        condition_value: 5,
      })

      expect(mockAchievementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ icon: '🏆', xp_reward: 0 }),
      )
      expect(result).toEqual({ id: 'a1' })
    })
  })

  describe('deleteEvent', () => {
    it('should throw NotFoundException when missing', async () => {
      mockEventRepository.findById.mockResolvedValue(null)
      await expect(service.deleteEvent('ghost', 'admin-1')).rejects.toThrow(NotFoundException)
    })

    it('should delete the event and write an audit log', async () => {
      mockEventRepository.findById.mockResolvedValue({ id: 'event-1', title: 'Raid' })
      mockEventRepository.delete.mockResolvedValue(undefined)
      mockAuditLogRepository.create.mockResolvedValue(undefined)

      const result = await service.deleteEvent('event-1', 'admin-1')

      expect(result.message).toContain('Raid')
    })
  })
})
