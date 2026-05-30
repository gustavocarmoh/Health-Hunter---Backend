import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm'

@Unique(['user_id', 'item_id'])
@Index(['user_id'])
@Entity('hunter_items')
export class HunterItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  user_id: string

  @Column({ type: 'uuid' })
  item_id: string

  @CreateDateColumn({ type: 'timestamptz' })
  purchased_at: Date
}
