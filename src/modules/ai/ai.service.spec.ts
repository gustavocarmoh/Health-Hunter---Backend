import { jest } from '@jest/globals'

const mockPost = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

jest.unstable_mockModule('axios', () => ({
  default: { post: mockPost },
}))

const { AiService } = await import('./ai.service.js')
const { NotFoundException, BadRequestException } = await import('@nestjs/common')
const { MessageRole } = await import('../../database/entities/ai-message.entity.js')

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockConversationRepository = {
  findById: asyncMock(),
  create: asyncMock(),
  findByUserIdPaginated: asyncMock(),
  delete: asyncMock(),
}
const mockMessageRepository = {
  create: asyncMock(),
  findByConversationId: asyncMock(),
  findByConversationIdPaginated: asyncMock(),
  deleteByConversationId: asyncMock(),
}
const mockConfigService = { get: jest.fn().mockReturnValue('http://ollama:11434') }

async function* fakeOllamaStream(chunks: Array<{ response?: string; done?: boolean }>) {
  for (const c of chunks) {
    yield Buffer.from(JSON.stringify(c) + '\n')
  }
}

async function drain(stream: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = []
  for await (const chunk of stream) out.push(chunk)
  return out
}

describe('AiService', () => {
  let service: InstanceType<typeof AiService>

  beforeEach(() => {
    jest.clearAllMocks()
    mockConfigService.get.mockReturnValue('http://ollama:11434')
    service = new (AiService as unknown as new (
      ...args: unknown[]
    ) => InstanceType<typeof AiService>)(
      mockConfigService,
      mockConversationRepository,
      mockMessageRepository,
    )
  })

  describe('chat', () => {
    it('should throw NotFoundException when the conversation does not exist', async () => {
      mockConversationRepository.findById.mockResolvedValue(null)

      await expect(
        service.chat('user-1', { conversation_id: 'ghost', message: 'oi' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when the conversation belongs to another user', async () => {
      mockConversationRepository.findById.mockResolvedValue({ id: 'c1', user_id: 'other' })

      await expect(
        service.chat('user-1', { conversation_id: 'c1', message: 'oi' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should create a new conversation when no conversation_id is given', async () => {
      mockConversationRepository.create.mockResolvedValue({ id: 'c1', user_id: 'user-1' })
      mockMessageRepository.create.mockResolvedValue(undefined)
      mockMessageRepository.findByConversationId.mockResolvedValue([])
      mockPost.mockResolvedValue({ data: fakeOllamaStream([{ response: 'Oi!', done: true }]) })

      const stream = await service.chat('user-1', { message: 'Olá' })
      await drain(stream)

      expect(mockConversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1' }),
      )
      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: MessageRole.USER, content: 'Olá' }),
      )
    })

    it('should stream the assistant response and persist it', async () => {
      mockConversationRepository.findById.mockResolvedValue({ id: 'c1', user_id: 'user-1' })
      mockMessageRepository.create.mockResolvedValue(undefined)
      mockMessageRepository.findByConversationId.mockResolvedValue([])
      mockPost.mockResolvedValue({
        data: fakeOllamaStream([
          { response: 'Olá', done: false },
          { response: '!', done: true },
        ]),
      })

      const stream = await service.chat('user-1', { conversation_id: 'c1', message: 'oi' })
      const chunks = await drain(stream)

      expect(chunks).toEqual(['Olá', '!'])
      expect(mockMessageRepository.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: MessageRole.ASSISTANT, content: 'Olá!' }),
      )
    })

    it('should throw BadRequestException when the Ollama call fails', async () => {
      mockConversationRepository.findById.mockResolvedValue({ id: 'c1', user_id: 'user-1' })
      mockMessageRepository.create.mockResolvedValue(undefined)
      mockMessageRepository.findByConversationId.mockResolvedValue([])
      mockPost.mockRejectedValue(new Error('ECONNREFUSED'))

      const stream = await service.chat('user-1', { conversation_id: 'c1', message: 'oi' })

      await expect(drain(stream)).rejects.toThrow(BadRequestException)
    })
  })

  describe('getConversations', () => {
    it('should return paginated conversations', async () => {
      mockConversationRepository.findByUserIdPaginated.mockResolvedValue({
        conversations: [],
        total: 0,
      })

      await service.getConversations('user-1', 1, 20)

      expect(mockConversationRepository.findByUserIdPaginated).toHaveBeenCalledWith('user-1', 1, 20)
    })
  })

  describe('getConversationHistory', () => {
    it('should throw NotFoundException when missing', async () => {
      mockConversationRepository.findById.mockResolvedValue(null)
      await expect(service.getConversationHistory('user-1', 'ghost')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw BadRequestException for another user conversation', async () => {
      mockConversationRepository.findById.mockResolvedValue({ id: 'c1', user_id: 'other' })
      await expect(service.getConversationHistory('user-1', 'c1')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should return the paginated message history', async () => {
      mockConversationRepository.findById.mockResolvedValue({ id: 'c1', user_id: 'user-1' })
      mockMessageRepository.findByConversationIdPaginated.mockResolvedValue({
        messages: [],
        total: 0,
      })

      await service.getConversationHistory('user-1', 'c1')

      expect(mockMessageRepository.findByConversationIdPaginated).toHaveBeenCalledWith('c1', 1, 50)
    })
  })

  describe('deleteConversation', () => {
    it('should throw NotFoundException when missing', async () => {
      mockConversationRepository.findById.mockResolvedValue(null)
      await expect(service.deleteConversation('user-1', 'ghost')).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException for another user conversation', async () => {
      mockConversationRepository.findById.mockResolvedValue({ id: 'c1', user_id: 'other' })
      await expect(service.deleteConversation('user-1', 'c1')).rejects.toThrow(BadRequestException)
    })

    it('should delete the messages and the conversation', async () => {
      mockConversationRepository.findById.mockResolvedValue({ id: 'c1', user_id: 'user-1' })
      mockMessageRepository.deleteByConversationId.mockResolvedValue(undefined)
      mockConversationRepository.delete.mockResolvedValue(undefined)

      await service.deleteConversation('user-1', 'c1')

      expect(mockMessageRepository.deleteByConversationId).toHaveBeenCalledWith('c1')
      expect(mockConversationRepository.delete).toHaveBeenCalledWith('c1')
    })
  })
})
