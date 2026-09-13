import { GuildInviteStatus } from '../enums/guild.enum.js'

/**
 * Convite enviado por um líder de guilda a um hunter.
 * Expira automaticamente após GUILD_INVITE_TTL_DAYS dias.
 */
export interface IGuildInvite {
  id: string
  guild_id: string
  /** UUID do hunter convidado */
  invited_user_id: string
  /** UUID do mestre ou vice-mestre que enviou o convite */
  invited_by_id: string
  status: GuildInviteStatus
  expires_at: Date
  created_at: Date
}
