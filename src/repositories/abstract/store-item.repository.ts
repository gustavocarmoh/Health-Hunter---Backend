import { IStoreItem } from '../../common/interfaces/store-item.interface.js'

export abstract class StoreItemRepository {
  abstract findAll(): Promise<IStoreItem[]>
  abstract findById(id: string): Promise<IStoreItem | null>
  abstract create(data: Omit<IStoreItem, 'id' | 'created_at'>): Promise<IStoreItem>
}
