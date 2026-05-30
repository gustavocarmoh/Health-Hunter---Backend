import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('seasons')
export class SeasonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 120 })
  title: string

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'timestamptz' })
  starts_at: Date

  @Column({ type: 'timestamptz' })
  ends_at: Date

  @Column({ type: 'boolean', default: false })
  is_active: boolean

  @Column({ type: 'float', default: 1.0 })
  xp_multiplier: number

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
