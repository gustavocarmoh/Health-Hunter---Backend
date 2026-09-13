import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm'
import { IEventParticipant } from '../../common/interfaces/event.interface.js'

@Entity('event_participants')
@Unique(['event_id', 'user_id'])
@Index(['event_id'])
export class EventParticipantEntity implements IEventParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  event_id: string

  @Column('uuid')
  user_id: string

  @Column({ type: 'int', default: 0 })
  xp_contributed: number

  /** XP efetivamente creditado no rank do Hunter neste evento (respeitando o cap). */
  @Column({ type: 'int', default: 0 })
  rank_xp_credited: number

  @CreateDateColumn({ type: 'timestamptz' })
  joined_at: Date
}
