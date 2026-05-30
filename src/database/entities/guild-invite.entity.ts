import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'
import { GuildInviteStatus } from '../../common/enums/guild.enum'
import { IGuildInvite } from '../../common/interfaces/guild-invite.interface'

@Entity('guild_invites')
@Index(['invited_user_id', 'status'])
export class GuildInviteEntity implements IGuildInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  guild_id: string

  @Column({ type: 'uuid' })
  invited_user_id: string

  @Column({ type: 'uuid' })
  invited_by_id: string

  @Column({
    type: 'enum',
    enum: GuildInviteStatus,
    default: GuildInviteStatus.PENDING,
  })
  status: GuildInviteStatus

  @Column({ type: 'timestamptz' })
  expires_at: Date

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
