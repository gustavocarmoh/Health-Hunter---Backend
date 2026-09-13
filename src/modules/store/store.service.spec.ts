import { jest } from '@jest/globals'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { StoreService } from './store.service.js'
import { StoreItemRepository } from '../../repositories/abstract/store-item.repository.js'
import { HunterItemRepository } from '../../repositories/abstract/hunter-item.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { RedisService } from '../../cache/redis.service.js'

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockStoreItemRepository = { findAll: asyncMock(), findById: asyncMock() }
const mockHunterItemRepository = {
  findOne: asyncMock(),
  create: asyncMock(),
  findByUserId: asyncMock(),
}
const mockUserRepository = { findById: asyncMock(), update: asyncMock() }
const mockRedisService = { del: asyncMock() }

const item = { id: 'item-1', is_available: true, price_coins: 100 }
const user = { id: 'user-1', is_deleted: false, coins: 500, name: 'Jin' }

describe('StoreService', () => {
  let service: StoreService

  beforeEach(() => {
    service = new StoreService(
      mockStoreItemRepository as unknown as StoreItemRepository,
      mockHunterItemRepository as unknown as HunterItemRepository,
      mockUserRepository as unknown as UserRepository,
      mockRedisService as unknown as RedisService,
    )
    jest.clearAllMocks()
  })

  describe('getItems', () => {
    it('should return the store catalog', async () => {
      mockStoreItemRepository.findAll.mockResolvedValue([item])
      await expect(service.getItems()).resolves.toEqual([item])
    })
  })

  describe('purchase', () => {
    it('should throw NotFoundException when the item does not exist', async () => {
      mockStoreItemRepository.findById.mockResolvedValue(null)
      await expect(service.purchase('user-1', 'item-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when the item is unavailable', async () => {
      mockStoreItemRepository.findById.mockResolvedValue({ ...item, is_available: false })
      await expect(service.purchase('user-1', 'item-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ConflictException when already owned', async () => {
      mockStoreItemRepository.findById.mockResolvedValue(item)
      mockHunterItemRepository.findOne.mockResolvedValue({ id: 'hi-1' })
      await expect(service.purchase('user-1', 'item-1')).rejects.toThrow(ConflictException)
    })

    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockStoreItemRepository.findById.mockResolvedValue(item)
      mockHunterItemRepository.findOne.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.purchase('user-1', 'item-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when coins are insufficient', async () => {
      mockStoreItemRepository.findById.mockResolvedValue(item)
      mockHunterItemRepository.findOne.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue({ ...user, coins: 50 })
      await expect(service.purchase('user-1', 'item-1')).rejects.toThrow(BadRequestException)
    })

    it('should deduct coins, create the hunter item, and invalidate the cache', async () => {
      mockStoreItemRepository.findById.mockResolvedValue(item)
      mockHunterItemRepository.findOne.mockResolvedValue(null)
      mockUserRepository.findById.mockResolvedValue(user)
      mockUserRepository.update.mockResolvedValue(undefined)
      mockHunterItemRepository.create.mockResolvedValue({ id: 'hi-1', item_id: 'item-1' })
      mockRedisService.del.mockResolvedValue(undefined)

      const result = await service.purchase('user-1', 'item-1')

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { coins: 400 })
      expect(mockRedisService.del).toHaveBeenCalledWith('hunter:profile:user-1')
      expect(result).toMatchObject({ message: 'Purchase successful.', coins_remaining: 400 })
    })
  })

  describe('getInventory', () => {
    it('should throw NotFoundException when the hunter does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)
      await expect(service.getInventory('ghost')).rejects.toThrow(NotFoundException)
    })

    it('should return the enriched inventory', async () => {
      mockUserRepository.findById.mockResolvedValue(user)
      mockHunterItemRepository.findByUserId.mockResolvedValue([{ item_id: 'item-1' }])
      mockStoreItemRepository.findById.mockResolvedValue(item)

      const result = await service.getInventory('user-1')

      expect(result.total).toBe(1)
      expect(result.inventory[0].item).toEqual(item)
    })
  })
})
