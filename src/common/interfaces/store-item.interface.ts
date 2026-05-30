export type StoreItemType = 'TITLE' | 'ICON' | 'FRAME' | 'COSMETIC'

export interface IStoreItem {
  id: string
  name: string
  description: string
  type: StoreItemType
  price_coins: number
  icon: string
  is_available: boolean
  created_at: Date
}
