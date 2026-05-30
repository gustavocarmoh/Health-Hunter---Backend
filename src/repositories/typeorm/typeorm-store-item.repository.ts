import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StoreItemEntity } from '../../database/entities/store-item.entity'
import { StoreItemRepository } from '../abstract/store-item.repository'
import { IStoreItem } from '../../common/interfaces/store-item.interface'

@Injectable()
export class TypeOrmStoreItemRepository extends StoreItemRepository {
  constructor(
    @InjectRepository(StoreItemEntity)
    private readonly repo: Repository<StoreItemEntity>,
  ) {
    super()
  }

  async findAll(): Promise<IStoreItem[]> {
    return this.repo.find({
      where: { is_available: true },
      order: { price_coins: 'ASC' },
    })
  }

  async findById(id: string): Promise<IStoreItem | null> {
    return this.repo.findOne({ where: { id } })
  }

  async create(data: Omit<IStoreItem, 'id' | 'created_at'>): Promise<IStoreItem> {
    const entity = this.repo.create(data as Partial<StoreItemEntity>)
    return this.repo.save(entity)
  }
}
