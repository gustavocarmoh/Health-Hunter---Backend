import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm'
import { UserEntity } from './user.entity'

@Entity('daily_missions')
export class DailyMission {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  user_id: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity

  @Column()
  name: string

  @Column()
  category: string

  @Column()
  difficulty: string

  @Column()
  xp: number

  @Column()
  icon: string

  @Column({ default: false })
  done: boolean

  @Column({ default: true })
  daily: boolean

  @CreateDateColumn()
  created_at: Date

  @Column({ type: 'timestamp' })
  expires_at: Date
}
