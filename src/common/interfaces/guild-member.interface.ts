import { GuildMemberRole } from '../enums/guild.enum.js'

/**
 * Vínculo entre um hunter e uma guilda.
 * Armazena o papel do membro e o XP contribuído à guilda.
 */
export interface IGuildMember {
  id: string
  guild_id: string
  user_id: string
  role: GuildMemberRole
  /** XP total que este membro acumulou enquanto estava na guilda */
  contribution_xp: number
  joined_at: Date
}
