import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'
import { IChallenge } from '../../common/interfaces/challenge.interface.js'

@Entity('challenges')
export class ChallengeEntity implements IChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 150 })
  title: string

  @Column({ type: 'text' })
  description: string

  @Column({ length: 100 })
  tipo_exercicio: string

  @Column({ type: 'int' })
  xp_base: number

  @Column({ type: 'int' })
  coins_base: number

  @Column({ length: 10, default: 'E' })
  min_rank_required: string

  @Column({ default: true })
  is_active: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
