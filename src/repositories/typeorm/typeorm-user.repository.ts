import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../../database/entities/user.entity.js'
import { UserRepository } from '../abstract/user.repository.js'
import { IUser } from '../../common/interfaces/user.interface.js'

@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {
    super()
  }

  async findById(id: string): Promise<IUser | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.repo.findOne({ where: { email } })
  }

  async create(userData: Omit<IUser, 'id' | 'created_at' | 'updated_at'>): Promise<IUser> {
    const entity = this.repo.create(userData as Partial<UserEntity>)
    return this.repo.save(entity)
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) return null
    Object.assign(existing, data)
    return this.repo.save(existing)
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async findAll(page: number, limit: number): Promise<{ users: IUser[]; total: number }> {
    const [users, total] = await this.repo.findAndCount({
      where: { is_deleted: false },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { users, total }
  }

  async findLeaderboard(
    filter: { region_state?: string; region_country?: string; city?: string },
    limit: number,
  ): Promise<IUser[]> {
    const qb = this.repo
      .createQueryBuilder('u')
      .where('u.is_deleted = false')
      .orderBy('u.xp', 'DESC')
      .limit(limit)

    if (filter.region_state) {
      qb.andWhere('u.region_state = :state', { state: filter.region_state })
    }
    if (filter.region_country) {
      qb.andWhere('u.region_country = :country', {
        country: filter.region_country,
      })
    }
    if (filter.city) {
      qb.andWhere('u.city = :city', { city: filter.city })
    }

    return qb.getMany()
  }

  async findLeaderboardCursor(
    filter: { region_state?: string; region_country?: string; city?: string },
    limit: number,
    cursor?: { xp: number; id: string },
  ): Promise<{ data: IUser[]; nextCursor: { xp: number; id: string } | null }> {
    const safeLimit = Math.min(limit, 100)

    // Keyset pagination: (xp < cursor.xp) OR (xp = cursor.xp AND id < cursor.id), garantindo
    // ordem estável mesmo com empate de XP. Busca 1 a mais para detectar se há próxima página.
    const qb = this.repo
      .createQueryBuilder('u')
      .where('u.is_deleted = false')
      .orderBy('u.xp', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .take(safeLimit + 1)

    if (filter.region_state) {
      qb.andWhere('u.region_state = :state', { state: filter.region_state })
    }
    if (filter.region_country) {
      qb.andWhere('u.region_country = :country', {
        country: filter.region_country,
      })
    }
    if (filter.city) {
      qb.andWhere('u.city = :city', { city: filter.city })
    }

    if (cursor) {
      qb.andWhere('(u.xp < :xp OR (u.xp = :xp AND u.id < :id))', {
        xp: cursor.xp,
        id: cursor.id,
      })
    }

    const rows = await qb.getMany()
    const hasMore = rows.length > safeLimit
    const data = hasMore ? rows.slice(0, safeLimit) : rows
    const last = data[data.length - 1]
    const nextCursor = hasMore && last ? { xp: last.xp, id: last.id } : null

    return { data, nextCursor }
  }

  async findByIds(ids: string[]): Promise<IUser[]> {
    if (ids.length === 0) return []
    return this.repo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids })
      .andWhere('u.is_deleted = false')
      .orderBy('u.xp', 'DESC')
      .getMany()
  }

  async findByNameContains(query: string, limit: number): Promise<IUser[]> {
    return this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .andWhere('u.is_deleted = false')
      .orderBy('u.xp', 'DESC')
      .limit(Math.min(limit, 100))
      .getMany()
  }

  async countActive(): Promise<number> {
    return this.repo.count({ where: { is_deleted: false } })
  }

  async countNewSince(since: Date): Promise<number> {
    return this.repo
      .createQueryBuilder('u')
      .where('u.is_deleted = false')
      .andWhere('u.created_at >= :since', { since })
      .getCount()
  }

  async countWithMoreXp(
    xp: number,
    filter: { region_state?: string; region_country?: string; city?: string },
  ): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('u')
      .where('u.is_deleted = false')
      .andWhere('u.xp > :xp', { xp })

    if (filter.region_state) {
      qb.andWhere('u.region_state = :state', { state: filter.region_state })
    }
    if (filter.region_country) {
      qb.andWhere('u.region_country = :country', {
        country: filter.region_country,
      })
    }
    if (filter.city) {
      qb.andWhere('u.city = :city', { city: filter.city })
    }

    return qb.getCount()
  }

  async findSuggested(
    region_state: string,
    rank_level: string,
    excludeIds: string[],
    limit: number,
  ): Promise<IUser[]> {
    const qb = this.repo
      .createQueryBuilder('u')
      .where('u.is_deleted = false')
      .andWhere('u.region_state = :region_state', { region_state })
      .andWhere('u.rank_level = :rank_level', { rank_level })
      .orderBy('u.xp', 'DESC')
      .take(limit)

    if (excludeIds.length > 0) {
      qb.andWhere('u.id NOT IN (:...excludeIds)', { excludeIds })
    }

    return qb.getMany()
  }
}
