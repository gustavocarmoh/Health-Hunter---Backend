import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EventEntity } from '../../database/entities/event.entity.js'
import { EventParticipantEntity } from '../../database/entities/event-participant.entity.js'
import { EventRepository } from '../abstract/event.repository.js'
import { IEvent, IEventParticipant } from '../../common/interfaces/event.interface.js'

@Injectable()
export class TypeOrmEventRepository extends EventRepository {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(EventParticipantEntity)
    private readonly participantRepo: Repository<EventParticipantEntity>,
  ) {
    super()
  }

  async findAllActive(): Promise<IEvent[]> {
    return this.eventRepo
      .createQueryBuilder('e')
      .where('e.is_active = true')
      .andWhere('e.ends_at > NOW()')
      .orderBy('e.ends_at', 'ASC')
      .getMany()
  }

  async findById(id: string): Promise<IEvent | null> {
    return this.eventRepo.findOne({ where: { id } })
  }

  async joinEvent(eventId: string, userId: string): Promise<IEventParticipant> {
    const entity = this.participantRepo.create({
      event_id: eventId,
      user_id: userId,
      xp_contributed: 0,
    })
    return this.participantRepo.save(entity)
  }

  async getLeaderboard(eventId: string): Promise<{ user_id: string; xp_contributed: number }[]> {
    return this.participantRepo
      .createQueryBuilder('p')
      .select(['p.user_id', 'p.xp_contributed'])
      .where('p.event_id = :eventId', { eventId })
      .orderBy('p.xp_contributed', 'DESC')
      .getMany() as Promise<{ user_id: string; xp_contributed: number }[]>
  }

  async isUserJoined(eventId: string, userId: string): Promise<boolean> {
    const count = await this.participantRepo.count({
      where: { event_id: eventId, user_id: userId },
    })
    return count > 0
  }

  async findByUserId(userId: string): Promise<IEvent[]> {
    const participations = await this.participantRepo.find({
      where: { user_id: userId },
      select: ['event_id'],
    })
    if (participations.length === 0) return []
    const ids = participations.map((p) => p.event_id)
    return this.eventRepo
      .createQueryBuilder('e')
      .where('e.id IN (:...ids)', { ids })
      .orderBy('e.starts_at', 'DESC')
      .getMany()
  }

  async leaveEvent(eventId: string, userId: string): Promise<void> {
    await this.participantRepo.delete({ event_id: eventId, user_id: userId })
  }

  async create(data: Omit<IEvent, 'id' | 'created_at'>): Promise<IEvent> {
    const entity = this.eventRepo.create(data as Partial<EventEntity>)
    return this.eventRepo.save(entity)
  }

  async update(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    const existing = await this.eventRepo.findOne({ where: { id } })
    if (!existing) return null
    Object.assign(existing, data)
    return this.eventRepo.save(existing)
  }

  async countActive(): Promise<number> {
    return this.eventRepo
      .createQueryBuilder('e')
      .where('e.is_active = true AND e.ends_at > NOW()')
      .getCount()
  }

  async getParticipantsWithUsers(
    eventId: string,
  ): Promise<{ user_id: string; name: string; xp_contributed: number; joined_at: Date }[]> {
    return this.participantRepo
      .createQueryBuilder('p')
      .innerJoin('users', 'u', 'u.id = p.user_id')
      .select([
        'p.user_id AS user_id',
        'u.name AS name',
        'p.xp_contributed AS xp_contributed',
        'p.joined_at AS joined_at',
      ])
      .where('p.event_id = :eventId', { eventId })
      .andWhere('u.is_deleted = false')
      .orderBy('p.xp_contributed', 'DESC')
      .getRawMany() as Promise<
      {
        user_id: string
        name: string
        xp_contributed: number
        joined_at: Date
      }[]
    >
  }

  async findAll(page: number, limit: number): Promise<{ events: IEvent[]; total: number }> {
    const [events, total] = await this.eventRepo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { events, total }
  }

  async delete(id: string): Promise<void> {
    await this.eventRepo.delete(id)
  }
}
