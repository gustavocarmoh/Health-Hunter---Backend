import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SeasonEntity } from '../../database/entities/season.entity'
import { SeasonRepository } from '../abstract/season.repository'
import { ISeason } from '../../common/interfaces/season.interface'

@Injectable()
export class TypeOrmSeasonRepository extends SeasonRepository {
  constructor(
    @InjectRepository(SeasonEntity)
    private readonly repo: Repository<SeasonEntity>,
  ) {
    super()
  }

  async findCurrent(): Promise<ISeason | null> {
    return this.repo
      .createQueryBuilder('s')
      .where('s.is_active = true')
      .andWhere('s.starts_at <= NOW()')
      .andWhere('s.ends_at >= NOW()')
      .orderBy('s.starts_at', 'DESC')
      .getOne()
  }

  async findById(id: string): Promise<ISeason | null> {
    return this.repo.findOne({ where: { id } })
  }

  async create(data: Omit<ISeason, 'id' | 'created_at'>): Promise<ISeason> {
    const entity = this.repo.create(data as Partial<SeasonEntity>)
    return this.repo.save(entity)
  }

  async update(id: string, data: Partial<ISeason>): Promise<ISeason> {
    await this.repo.update(id, data)
    const updated = await this.repo.findOne({ where: { id } })
    return updated!
  }

  async deactivateAll(): Promise<void> {
    await this.repo.update({ is_active: true }, { is_active: false })
  }
}
