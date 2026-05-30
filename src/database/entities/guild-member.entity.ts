import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm'
import { GuildMemberRole } from '../../common/enums/guild.enum'
import { IGuildMember } from '../../common/interfaces/guild-member.interface'

@Entity('guild_members')
@Unique(['guild_id', 'user_id'])
@Index(['user_id'])
export class GuildMemberEntity implements IGuildMember {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  guild_id: string

  @Column({ type: 'uuid' })
  user_id: string

  @Column({
    type: 'enum',
    enum: GuildMemberRole,
    default: GuildMemberRole.MEMBER,
  })
  role: GuildMemberRole

  @Column({ type: 'int', default: 0 })
  contribution_xp: number

  @CreateDateColumn({ type: 'timestamptz' })
  joined_at: Date
}
