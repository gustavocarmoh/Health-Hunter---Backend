import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AchievementEntity } from '../../database/entities/achievement.entity.js'
import { AchievementRepository } from '../abstract/achievement.repository.js'
import { IAchievement } from '../../common/interfaces/achievement.interface.js'

@Injectable()
export class TypeOrmAchievementRepository extends AchievementRepository {
  constructor(
    @InjectRepository(AchievementEntity)
    private readonly repo: Repository<AchievementEntity>,
  ) {
    super()
  }

  async findAll(): Promise<IAchievement[]> {
    return this.repo.find({ order: { condition_value: 'ASC' } })
  }

  async create(data: Omit<IAchievement, 'id' | 'created_at'>): Promise<IAchievement> {
    const entity = this.repo.create(data as Partial<AchievementEntity>)
    return this.repo.save(entity)
  }
}
