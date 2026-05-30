import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'
import { IAchievement } from '../../common/interfaces/achievement.interface'

@Entity('achievements')
export class AchievementEntity implements IAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 150 })
  title: string

  @Column({ type: 'text' })
  description: string

  @Column({ length: 10, default: '🏆' })
  icon: string

  @Column({ type: 'varchar', length: 50 })
  condition_type: 'ACTIVITIES_COUNT' | 'DISTANCE_KM' | 'RANK_REACHED'

  @Column({ type: 'float' })
  condition_value: number

  @Column({ type: 'int', default: 0 })
  xp_reward: number

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
