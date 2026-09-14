import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { GuildInviteEntity } from '../../database/entities/guild-invite.entity.js'
import { GuildInviteRepository } from '../abstract/guild-invite.repository.js'
import { IGuildInvite } from '../../common/interfaces/guild-invite.interface.js'
import { GuildInviteStatus } from '../../common/enums/guild.enum.js'

@Injectable()
export class TypeOrmGuildInviteRepository extends GuildInviteRepository {
  constructor(
    @InjectRepository(GuildInviteEntity)
    private readonly repo: Repository<GuildInviteEntity>,
  ) {
    super()
  }

  async create(data: Partial<IGuildInvite>): Promise<IGuildInvite> {
    const entity = this.repo.create(data as GuildInviteEntity)
    return this.repo.save(entity)
  }

  async findById(id: string): Promise<IGuildInvite | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findPendingByUserId(userId: string): Promise<IGuildInvite[]> {
    return this.repo.find({
      where: {
        invited_user_id: userId,
        status: GuildInviteStatus.PENDING,
      },
      order: { created_at: 'DESC' },
    })
  }

  async findByGuildAndUser(guildId: string, userId: string): Promise<IGuildInvite | null> {
    return this.repo.findOne({
      where: {
        guild_id: guildId,
        invited_user_id: userId,
        status: GuildInviteStatus.PENDING,
      },
    })
  }

  async updateStatus(id: string, status: GuildInviteStatus): Promise<IGuildInvite> {
    await this.repo.update(id, { status })
    return this.repo.findOneOrFail({ where: { id } })
  }

  async expireOld(): Promise<void> {
    await this.repo.update(
      { status: GuildInviteStatus.PENDING, expires_at: LessThan(new Date()) },
      { status: GuildInviteStatus.EXPIRED },
    )
  }
}
