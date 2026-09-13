import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'
import { IEvent } from '../../common/interfaces/event.interface.js'

@Entity('events')
export class EventEntity implements IEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 200 })
  title: string

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'varchar', length: 20 })
  type: 'RAID' | 'CAMPAIGN'

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  region_filter: string | null

  /**
   * Teto de XP que cada Hunter pode creditar no rank através deste evento.
   * null = sem teto.
   */
  @Column({ type: 'int', nullable: true, default: null })
  xp_cap_per_hunter: number | null

  @Column({ type: 'timestamptz' })
  starts_at: Date

  @Column({ type: 'timestamptz' })
  ends_at: Date

  @Column({ default: true })
  is_active: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
