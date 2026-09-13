import { IEvent, IEventParticipant } from '../../common/interfaces/event.interface.js'

/**
 * Contrato abstrato do repositório de eventos e participações.
 */
export abstract class EventRepository {
  /**
   * Retorna todos os eventos com `is_active = true`.
   * @returns Lista de eventos ativos
   */
  abstract findAllActive(): Promise<IEvent[]>

  /**
   * Busca um evento pelo UUID.
   * @param id - UUID do evento
   * @returns Evento encontrado ou `null`
   */
  abstract findById(id: string): Promise<IEvent | null>

  /**
   * Inscreve um Hunter em um evento.
   * @param eventId - UUID do evento
   * @param userId - UUID do Hunter
   * @returns Registro de participação criado
   */
  abstract joinEvent(eventId: string, userId: string): Promise<IEventParticipant>

  /**
   * Retorna o placar dos participantes de um evento ordenado por XP contribuído.
   * @param eventId - UUID do evento
   * @returns Array de `{ user_id, xp_contributed }` ordenado descendente
   */
  abstract getLeaderboard(eventId: string): Promise<{ user_id: string; xp_contributed: number }[]>

  abstract isUserJoined(eventId: string, userId: string): Promise<boolean>

  /** Retorna eventos em que o Hunter está inscrito. */
  abstract findByUserId(userId: string): Promise<IEvent[]>

  /** Remove a inscrição do Hunter no evento. */
  abstract leaveEvent(eventId: string, userId: string): Promise<void>

  /** Cria um novo evento. */
  abstract create(data: Omit<IEvent, 'id' | 'created_at'>): Promise<IEvent>

  /** Atualiza campos de um evento. */
  abstract update(id: string, data: Partial<IEvent>): Promise<IEvent | null>

  /** Conta eventos ativos. */
  abstract countActive(): Promise<number>

  /** Retorna participantes de um evento com nome do Hunter. */
  abstract getParticipantsWithUsers(
    eventId: string,
  ): Promise<{ user_id: string; name: string; xp_contributed: number; joined_at: Date }[]>

  /** Lista todos os eventos com paginação (admin). */
  abstract findAll(page: number, limit: number): Promise<{ events: IEvent[]; total: number }>

  /** Remove permanentemente um evento. */
  abstract delete(id: string): Promise<void>
}
