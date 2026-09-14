import { GuildMemberRole } from '../enums/guild.enum.js'

export interface IGuildMember {
  id: string
  guild_id: string
  user_id: string
  role: GuildMemberRole
  contribution_xp: number
  joined_at: Date
}
