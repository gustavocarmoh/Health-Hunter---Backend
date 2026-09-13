import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'
import { StoreItemType } from '../../common/interfaces/store-item.interface.js'

@Entity('store_items')
export class StoreItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'varchar', length: 20 })
  type: StoreItemType

  @Column({ type: 'int' })
  price_coins: number

  @Column({ type: 'varchar', length: 10, default: '🎁' })
  icon: string

  @Column({ type: 'boolean', default: true })
  is_available: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
