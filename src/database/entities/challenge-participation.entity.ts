import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm'
import {
  IChallengeParticipation,
  ChallengeParticipationStatus,
} from '../../common/interfaces/challenge-participation.interface'

@Entity('challenge_participations')
@Unique(['challenge_id', 'user_id'])
@Index(['user_id'])
export class ChallengeParticipationEntity implements IChallengeParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  challenge_id: string

  @Column('uuid')
  user_id: string

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: ChallengeParticipationStatus

  @CreateDateColumn({ type: 'timestamptz' })
  joined_at: Date

  @Column({ type: 'timestamptz', nullable: true, default: null })
  completed_at: Date | null
}
