import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike } from 'typeorm'
import { GuildEntity } from '../../database/entities/guild.entity.js'
import { GuildRepository } from '../abstract/guild.repository.js'
import { IGuild } from '../../common/interfaces/guild.interface.js'

// Todas as queries filtram is_disbanded = false por padrão, exceto operações internas explícitas.
@Injectable()
export class TypeOrmGuildRepository extends GuildRepository {
  constructor(
    @InjectRepository(GuildEntity)
    private readonly repo: Repository<GuildEntity>,
  ) {
    super()
  }

  async findById(id: string): Promise<IGuild | null> {
    return this.repo.findOne({ where: { id, is_disbanded: false } })
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ guilds: IGuild[]; total: number }> {
    const where = search
      ? [
          { name: ILike(`%${search}%`), is_public: true, is_disbanded: false },
          { tag: ILike(`%${search}%`), is_public: true, is_disbanded: false },
        ]
      : { is_public: true, is_disbanded: false }

    const [guilds, total] = await this.repo.findAndCount({
      where,
      order: { xp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { guilds, total }
  }

  async findByMasterId(masterId: string): Promise<IGuild | null> {
    return this.repo.findOne({
      where: { master_id: masterId, is_disbanded: false },
    })
  }

  async create(data: Partial<IGuild>): Promise<IGuild> {
    const entity = this.repo.create(data as GuildEntity)
    return this.repo.save(entity)
  }

  async update(id: string, data: Partial<IGuild>): Promise<IGuild | null> {
    await this.repo.update(id, data as Partial<GuildEntity>)
    return this.repo.findOne({ where: { id } })
  }

  async disband(id: string): Promise<void> {
    await this.repo.update(id, { is_disbanded: true })
  }
}
