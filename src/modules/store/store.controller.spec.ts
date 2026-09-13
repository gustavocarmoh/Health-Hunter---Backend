import { jest } from '@jest/globals'
import { StoreController } from './store.controller.js'
import { StoreService } from './store.service.js'

const mockService = {
  getItems: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  purchase: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getInventory: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

describe('StoreController', () => {
  let controller: StoreController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new StoreController(mockService as unknown as StoreService)
    jest.clearAllMocks()
  })

  it('should return the store items', async () => {
    mockService.getItems.mockResolvedValue([{ id: 'item-1' }])
    await expect(controller.getItems()).resolves.toEqual([{ id: 'item-1' }])
  })

  it('should delegate purchase to the service', async () => {
    mockService.purchase.mockResolvedValue({ message: 'ok' })

    await controller.purchase(user, { item_id: 'item-1' })

    expect(mockService.purchase).toHaveBeenCalledWith('user-1', 'item-1')
  })

  it('should return the hunter inventory', async () => {
    mockService.getInventory.mockResolvedValue({ total: 0, inventory: [] })

    await controller.getInventory(user)

    expect(mockService.getInventory).toHaveBeenCalledWith('user-1')
  })
})
