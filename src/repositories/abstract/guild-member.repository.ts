import { IGuildMember } from '../../common/interfaces/guild-member.interface.js'
import { GuildMemberRole } from '../../common/enums/guild.enum.js'

export abstract class GuildMemberRepository {
  abstract findByGuildId(guildId: string): Promise<IGuildMember[]>

  abstract findByUserId(userId: string): Promise<IGuildMember | null>

  abstract findByGuildAndUser(guildId: string, userId: string): Promise<IGuildMember | null>

  abstract countByGuildId(guildId: string): Promise<number>

  abstract addMember(data: Partial<IGuildMember>): Promise<IGuildMember>

  abstract updateRole(id: string, role: GuildMemberRole): Promise<IGuildMember>

  abstract addContribution(memberId: string, xp: number): Promise<void>

  abstract removeMember(id: string): Promise<void>

  abstract getTopContributors(guildId: string, limit: number): Promise<IGuildMember[]>
}
