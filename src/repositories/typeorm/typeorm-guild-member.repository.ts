import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { GuildMemberEntity } from '../../database/entities/guild-member.entity.js'
import { GuildMemberRepository } from '../abstract/guild-member.repository.js'
import { IGuildMember } from '../../common/interfaces/guild-member.interface.js'
import { GuildMemberRole } from '../../common/enums/guild.enum.js'

@Injectable()
export class TypeOrmGuildMemberRepository extends GuildMemberRepository {
  constructor(
    @InjectRepository(GuildMemberEntity)
    private readonly repo: Repository<GuildMemberEntity>,
  ) {
    super()
  }

  async findByGuildId(guildId: string): Promise<IGuildMember[]> {
    return this.repo.find({
      where: { guild_id: guildId },
      order: { contribution_xp: 'DESC' },
    })
  }

  async findByUserId(userId: string): Promise<IGuildMember | null> {
    return this.repo.findOne({ where: { user_id: userId } })
  }

  async findByGuildAndUser(guildId: string, userId: string): Promise<IGuildMember | null> {
    return this.repo.findOne({ where: { guild_id: guildId, user_id: userId } })
  }

  async countByGuildId(guildId: string): Promise<number> {
    return this.repo.count({ where: { guild_id: guildId } })
  }

  async addMember(data: Partial<IGuildMember>): Promise<IGuildMember> {
    const entity = this.repo.create(data as GuildMemberEntity)
    return this.repo.save(entity)
  }

  async updateRole(id: string, role: GuildMemberRole): Promise<IGuildMember> {
    await this.repo.update(id, { role })
    return this.repo.findOneOrFail({ where: { id } })
  }

  async addContribution(memberId: string, xp: number): Promise<void> {
    await this.repo.increment({ id: memberId }, 'contribution_xp', xp)
  }

  async removeMember(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async getTopContributors(guildId: string, limit: number): Promise<IGuildMember[]> {
    return this.repo.find({
      where: { guild_id: guildId },
      order: { contribution_xp: 'DESC' },
      take: limit,
    })
  }
}
