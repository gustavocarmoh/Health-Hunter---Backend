import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike } from 'typeorm'
import { GuildEntity } from '../../database/entities/guild.entity.js'
import { GuildRepository } from '../abstract/guild.repository.js'
import { IGuild } from '../../common/interfaces/guild.interface.js'

/**
 * Implementação TypeORM do GuildRepository.
 * Todas as queries filtram guildas disbandadas (`is_disbanded = false`)
 * por padrão, exceto em operações internas explícitas.
 */
@Injectable()
export class TypeOrmGuildRepository extends GuildRepository {
  constructor(
    @InjectRepository(GuildEntity)
    private readonly repo: Repository<GuildEntity>,
  ) {
    super()
  }

  /**
   * Busca guilda ativa pelo UUID.
   * Retorna null se disbandada ou inexistente.
   *
   * @param id - UUID da guilda
   */
  async findById(id: string): Promise<IGuild | null> {
    return this.repo.findOne({ where: { id, is_disbanded: false } })
  }

  /**
   * Lista guildas públicas e ativas com busca opcional por nome ou tag.
   * Ordenado por XP descendente (mais fortes primeiro).
   *
   * @param page - Página (1-indexed)
   * @param limit - Itens por página (máx. recomendado: 50)
   * @param search - Substring do nome ou da tag
   */
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

  /**
   * Retorna a guilda onde o hunter informado é mestre e que ainda está ativa.
   *
   * @param masterId - UUID do hunter mestre
   */
  async findByMasterId(masterId: string): Promise<IGuild | null> {
    return this.repo.findOne({
      where: { master_id: masterId, is_disbanded: false },
    })
  }

  /**
   * Cria e persiste uma nova guilda.
   *
   * @param data - Dados iniciais da guilda
   */
  async create(data: Partial<IGuild>): Promise<IGuild> {
    const entity = this.repo.create(data as GuildEntity)
    return this.repo.save(entity)
  }

  /**
   * Aplica uma atualização parcial em uma guilda e retorna o estado atualizado.
   *
   * @param id - UUID da guilda
   * @param data - Campos a atualizar
   */
  async update(id: string, data: Partial<IGuild>): Promise<IGuild | null> {
    await this.repo.update(id, data as Partial<GuildEntity>)
    return this.repo.findOne({ where: { id } })
  }

  /**
   * Marca a guilda como disbandada sem removê-la do banco.
   * Preserva o histórico de membros e contribuições.
   *
   * @param id - UUID da guilda
   */
  async disband(id: string): Promise<void> {
    await this.repo.update(id, { is_disbanded: true })
  }
}
