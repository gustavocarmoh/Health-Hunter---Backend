import { GuildInviteStatus } from '../enums/guild.enum.js'

export interface IGuildInvite {
  id: string
  guild_id: string
  invited_user_id: string
  invited_by_id: string
  status: GuildInviteStatus
  expires_at: Date
  created_at: Date
}
