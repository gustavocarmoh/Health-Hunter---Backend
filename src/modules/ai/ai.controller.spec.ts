import { jest } from '@jest/globals'
import { AiController } from './ai.controller.js'
import { AiService } from './ai.service.js'
import type { Response } from 'express'

const mockService = {
  chat: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getConversations: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  getConversationHistory: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
  deleteConversation: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
}

function buildResponse() {
  const res: Partial<Response> = {}
  res.setHeader = jest.fn() as unknown as Response['setHeader']
  res.write = jest.fn() as unknown as Response['write']
  res.end = jest.fn() as unknown as Response['end']
  return res as Response
}

async function* asyncIterable(values: string[]) {
  for (const v of values) yield v
}

describe('AiController', () => {
  let controller: AiController
  const user = { id: 'user-1' } as never

  beforeEach(() => {
    controller = new AiController(mockService as unknown as AiService)
    jest.clearAllMocks()
  })

  it('should stream chunks as SSE and close the response', async () => {
    mockService.chat.mockResolvedValue(asyncIterable(['Olá', '!']))
    const res = buildResponse()

    await controller.chat({ message: 'oi' } as never, user, res)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('Olá'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"done":true'))
    expect(res.end).toHaveBeenCalled()
  })

  it('should write an SSE error event when the service throws', async () => {
    mockService.chat.mockRejectedValue(new Error('boom'))
    const res = buildResponse()

    await controller.chat({ message: 'oi' } as never, user, res)

    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"error"'))
    expect(res.end).toHaveBeenCalled()
  })

  it('should get conversations for the current user', async () => {
    mockService.getConversations.mockResolvedValue({ conversations: [], total: 0 })
    await controller.getConversations(user)
    expect(mockService.getConversations).toHaveBeenCalledWith('user-1', 1, 20)
  })

  it('should get the conversation history', async () => {
    mockService.getConversationHistory.mockResolvedValue({ messages: [], total: 0 })
    await controller.getConversationHistory('c1', user)
    expect(mockService.getConversationHistory).toHaveBeenCalledWith('user-1', 'c1')
  })

  it('should delete a conversation', async () => {
    mockService.deleteConversation.mockResolvedValue(undefined)
    await controller.deleteConversation('c1', user)
    expect(mockService.deleteConversation).toHaveBeenCalledWith('user-1', 'c1')
  })
})
