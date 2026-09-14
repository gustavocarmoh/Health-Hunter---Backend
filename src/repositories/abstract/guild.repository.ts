import { IGuild } from '../../common/interfaces/guild.interface.js'

export abstract class GuildRepository {
  abstract findById(id: string): Promise<IGuild | null>

  abstract findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ guilds: IGuild[]; total: number }>

  abstract findByMasterId(masterId: string): Promise<IGuild | null>

  abstract create(data: Partial<IGuild>): Promise<IGuild>

  abstract update(id: string, data: Partial<IGuild>): Promise<IGuild | null>

  // Soft delete: não remove o registro para preservar histórico de membros.
  abstract disband(id: string): Promise<void>
}
