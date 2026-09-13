import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HunterItemEntity } from '../../database/entities/hunter-item.entity.js'
import { HunterItemRepository } from '../abstract/hunter-item.repository.js'
import { IHunterItem } from '../../common/interfaces/hunter-item.interface.js'

@Injectable()
export class TypeOrmHunterItemRepository extends HunterItemRepository {
  constructor(
    @InjectRepository(HunterItemEntity)
    private readonly repo: Repository<HunterItemEntity>,
  ) {
    super()
  }

  async findByUserId(userId: string): Promise<IHunterItem[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { purchased_at: 'DESC' },
    })
  }

  async findOne(userId: string, itemId: string): Promise<IHunterItem | null> {
    return this.repo.findOne({ where: { user_id: userId, item_id: itemId } })
  }

  async create(data: Omit<IHunterItem, 'id' | 'purchased_at'>): Promise<IHunterItem> {
    const entity = this.repo.create(data as Partial<HunterItemEntity>)
    return this.repo.save(entity)
  }
}
