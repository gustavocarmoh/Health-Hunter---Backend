import { IHunterItem } from '../../common/interfaces/hunter-item.interface'

export abstract class HunterItemRepository {
  abstract findByUserId(userId: string): Promise<IHunterItem[]>
  abstract findOne(userId: string, itemId: string): Promise<IHunterItem | null>
  abstract create(data: Omit<IHunterItem, 'id' | 'purchased_at'>): Promise<IHunterItem>
}
