import { IEvent, IEventParticipant } from '../../common/interfaces/event.interface.js'

export abstract class EventRepository {
  abstract findAllActive(): Promise<IEvent[]>

  abstract findById(id: string): Promise<IEvent | null>

  abstract joinEvent(eventId: string, userId: string): Promise<IEventParticipant>

  abstract getLeaderboard(eventId: string): Promise<{ user_id: string; xp_contributed: number }[]>

  abstract isUserJoined(eventId: string, userId: string): Promise<boolean>

  abstract findByUserId(userId: string): Promise<IEvent[]>

  abstract leaveEvent(eventId: string, userId: string): Promise<void>

  abstract create(data: Omit<IEvent, 'id' | 'created_at'>): Promise<IEvent>

  abstract update(id: string, data: Partial<IEvent>): Promise<IEvent | null>

  abstract countActive(): Promise<number>

  abstract getParticipantsWithUsers(
    eventId: string,
  ): Promise<{ user_id: string; name: string; xp_contributed: number; joined_at: Date }[]>

  abstract findAll(page: number, limit: number): Promise<{ events: IEvent[]; total: number }>

  abstract delete(id: string): Promise<void>
}
