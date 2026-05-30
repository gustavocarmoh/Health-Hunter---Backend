import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'
import { INotification } from '../../common/interfaces/notification.interface'

@Entity('notifications')
@Index(['user_id', 'is_read'])
export class NotificationEntity implements INotification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  user_id: string

  @Column({ length: 50 })
  type: string

  @Column({ length: 200 })
  title: string

  @Column({ type: 'text' })
  body: string

  @Column({ default: false })
  is_read: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
