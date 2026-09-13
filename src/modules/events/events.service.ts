import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { EventRepository } from '../../repositories/abstract/event.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { RedisService } from '../../cache/redis.service.js'

const EVENTS_TTL = 60 // 1 minute

@Injectable()
export class EventsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Retorna todos os eventos ativos filtrados pela localização do Hunter.
   *
   * Utiliza cache Redis (`events:active`, TTL 60 s). Eventos sem `region_filter`
   * são visíveis para todos os hunters.
   *
   * @param userId - UUID do Hunter autenticado (usado para filtro regional)
   * @returns Lista de eventos ativos acessíveis ao Hunter
   */
  async getActiveEvents(userId: string) {
    const cacheKey = 'events:active'
    const cached = await this.redisService.get(cacheKey)

    const user = await this.userRepository.findById(userId)
    const allActive = cached
      ? (cached as Awaited<ReturnType<typeof this.eventRepository.findAllActive>>)
      : await this.eventRepository.findAllActive()

    if (!cached) {
      await this.redisService.set(cacheKey, allActive, EVENTS_TTL)
    }

    return allActive.filter(
      (e) => e.region_filter === null || (user && e.region_filter === user.region_state),
    )
  }

  /**
   * Inscreve o Hunter em um evento ativo.
   *
   * Invalida o cache `events:active` após a inscrição para forçar
   * a recalculação de vagas/estatísticas na próxima requisição.
   *
   * @param eventId - UUID do evento
   * @param userId - UUID do Hunter
   * @returns Registro de participação criado
   * @throws NotFoundException se o evento não existir ou estiver inativo
   * @throws ConflictException se o Hunter já estiver inscrito
   */
  async joinEvent(eventId: string, userId: string) {
    const event = await this.eventRepository.findById(eventId)
    if (!event || !event.is_active) {
      throw new NotFoundException('Event not found or no longer active.')
    }

    const alreadyJoined = await this.eventRepository.isUserJoined(eventId, userId)
    if (alreadyJoined) {
      throw new ConflictException('Hunter already enrolled in this event.')
    }

    const result = await this.eventRepository.joinEvent(eventId, userId)
    await this.redisService.del('events:active')
    return result
  }

  /**
   * Retorna o leaderboard de participantes de um evento específico.
   *
   * @param eventId - UUID do evento
   * @returns Objeto com `event_id`, `event_title` e lista `leaderboard`
   * @throws NotFoundException se o evento não for encontrado
   */
  async getEvent(eventId: string) {
    const event = await this.eventRepository.findById(eventId)
    if (!event) throw new NotFoundException('Event not found.')
    return event
  }

  async getMyEvents(userId: string) {
    const events = await this.eventRepository.findByUserId(userId)
    return { total: events.length, events }
  }

  async leaveEvent(eventId: string, userId: string) {
    const event = await this.eventRepository.findById(eventId)
    if (!event) throw new NotFoundException('Event not found.')

    const joined = await this.eventRepository.isUserJoined(eventId, userId)
    if (!joined) throw new NotFoundException('Hunter is not enrolled in this event.')

    await this.eventRepository.leaveEvent(eventId, userId)
    await this.redisService.del('events:active')
    return { message: 'Successfully left the event.' }
  }

  async getLeaderboard(eventId: string) {
    const event = await this.eventRepository.findById(eventId)
    if (!event) throw new NotFoundException('Event not found.')

    const leaderboard = await this.eventRepository.getLeaderboard(eventId)
    return {
      event_id: eventId,
      event_title: event.title,
      leaderboard,
    }
  }
}
