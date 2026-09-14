import { IGuildInvite } from '../../common/interfaces/guild-invite.interface.js'
import { GuildInviteStatus } from '../../common/enums/guild.enum.js'

export abstract class GuildInviteRepository {
  abstract create(data: Partial<IGuildInvite>): Promise<IGuildInvite>

  abstract findById(id: string): Promise<IGuildInvite | null>

  abstract findPendingByUserId(userId: string): Promise<IGuildInvite[]>

  abstract findByGuildAndUser(guildId: string, userId: string): Promise<IGuildInvite | null>

  abstract updateStatus(id: string, status: GuildInviteStatus): Promise<IGuildInvite>

  abstract expireOld(): Promise<void>
}
