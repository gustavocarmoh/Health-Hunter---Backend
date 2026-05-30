import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'
import { HunterRank } from '../../common/enums/rank.enum'
import { IGuild } from '../../common/interfaces/guild.interface'

@Entity('guilds')
@Index(['tag'], { unique: true })
export class GuildEntity implements IGuild {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 50 })
  name: string

  @Column({ length: 6 })
  tag: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ length: 10, default: '⚔️' })
  emblem: string

  @Column({ type: 'uuid' })
  master_id: string

  @Column({ type: 'enum', enum: HunterRank, default: HunterRank.E })
  rank: HunterRank

  @Column({ type: 'int', default: 0 })
  xp: number

  @Column({ default: true })
  is_public: boolean

  @Column({ default: false })
  is_disbanded: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date
}
