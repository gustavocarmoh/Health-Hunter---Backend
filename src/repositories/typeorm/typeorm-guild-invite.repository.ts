import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { GuildInviteEntity } from '../../database/entities/guild-invite.entity.js'
import { GuildInviteRepository } from '../abstract/guild-invite.repository.js'
import { IGuildInvite } from '../../common/interfaces/guild-invite.interface.js'
import { GuildInviteStatus } from '../../common/enums/guild.enum.js'

/**
 * Implementação TypeORM do GuildInviteRepository.
 * Gerencia o ciclo de vida de convites: criação, resposta e expiração.
 */
@Injectable()
export class TypeOrmGuildInviteRepository extends GuildInviteRepository {
  constructor(
    @InjectRepository(GuildInviteEntity)
    private readonly repo: Repository<GuildInviteEntity>,
  ) {
    super()
  }

  /**
   * Persiste um novo convite de guilda.
   *
   * @param data - Dados do convite incluindo guild_id, invited_user_id, invited_by_id e expires_at
   */
  async create(data: Partial<IGuildInvite>): Promise<IGuildInvite> {
    const entity = this.repo.create(data as GuildInviteEntity)
    return this.repo.save(entity)
  }

  /**
   * Busca um convite pelo UUID sem filtro de status.
   *
   * @param id - UUID do convite
   */
  async findById(id: string): Promise<IGuildInvite | null> {
    return this.repo.findOne({ where: { id } })
  }

  /**
   * Lista os convites com status PENDING endereçados a um hunter específico.
   * Filtro adicional: exclui convites já expirados pelo campo expires_at.
   *
   * @param userId - UUID do hunter convidado
   */
  async findPendingByUserId(userId: string): Promise<IGuildInvite[]> {
    return this.repo.find({
      where: {
        invited_user_id: userId,
        status: GuildInviteStatus.PENDING,
      },
      order: { created_at: 'DESC' },
    })
  }

  /**
   * Busca um convite pendente entre guilda e hunter.
   * Retorna null se não houver convite pendente (já respondido ou inexistente).
   *
   * @param guildId - UUID da guilda
   * @param userId - UUID do hunter alvo
   */
  async findByGuildAndUser(guildId: string, userId: string): Promise<IGuildInvite | null> {
    return this.repo.findOne({
      where: {
        guild_id: guildId,
        invited_user_id: userId,
        status: GuildInviteStatus.PENDING,
      },
    })
  }

  /**
   * Atualiza o status do convite e retorna o registro atualizado.
   *
   * @param id - UUID do convite
   * @param status - Novo status (ACCEPTED, DECLINED ou EXPIRED)
   */
  async updateStatus(id: string, status: GuildInviteStatus): Promise<IGuildInvite> {
    await this.repo.update(id, { status })
    return this.repo.findOneOrFail({ where: { id } })
  }

  /**
   * Marca como EXPIRED todos os convites pendentes com expires_at no passado.
   * Invocado pelo job semanal do SchedulerService.
   */
  async expireOld(): Promise<void> {
    await this.repo.update(
      { status: GuildInviteStatus.PENDING, expires_at: LessThan(new Date()) },
      { status: GuildInviteStatus.EXPIRED },
    )
  }
}
