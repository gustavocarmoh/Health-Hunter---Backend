import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { GuildMemberEntity } from '../../database/entities/guild-member.entity'
import { GuildMemberRepository } from '../abstract/guild-member.repository'
import { IGuildMember } from '../../common/interfaces/guild-member.interface'
import { GuildMemberRole } from '../../common/enums/guild.enum'

/**
 * Implementação TypeORM do GuildMemberRepository.
 * Gerencia os vínculos entre hunters e guildas,
 * incluindo papéis e XP de contribuição.
 */
@Injectable()
export class TypeOrmGuildMemberRepository extends GuildMemberRepository {
  constructor(
    @InjectRepository(GuildMemberEntity)
    private readonly repo: Repository<GuildMemberEntity>,
  ) {
    super()
  }

  /**
   * Retorna todos os membros de uma guilda, ordenados por contribution_xp DESC.
   *
   * @param guildId - UUID da guilda
   */
  async findByGuildId(guildId: string): Promise<IGuildMember[]> {
    return this.repo.find({
      where: { guild_id: guildId },
      order: { contribution_xp: 'DESC' },
    })
  }

  /**
   * Retorna o vínculo de guilda ativo de um hunter.
   * Um hunter só pode pertencer a uma guilda por vez.
   *
   * @param userId - UUID do hunter
   */
  async findByUserId(userId: string): Promise<IGuildMember | null> {
    return this.repo.findOne({ where: { user_id: userId } })
  }

  /**
   * Busca o registro específico de vinculação guilda↔hunter.
   *
   * @param guildId - UUID da guilda
   * @param userId - UUID do hunter
   */
  async findByGuildAndUser(guildId: string, userId: string): Promise<IGuildMember | null> {
    return this.repo.findOne({ where: { guild_id: guildId, user_id: userId } })
  }

  /**
   * Conta membros ativos de uma guilda para validação de capacidade máxima.
   *
   * @param guildId - UUID da guilda
   */
  async countByGuildId(guildId: string): Promise<number> {
    return this.repo.count({ where: { guild_id: guildId } })
  }

  /**
   * Insere um novo membro na guilda.
   *
   * @param data - Dados do vínculo (guild_id, user_id, role)
   */
  async addMember(data: Partial<IGuildMember>): Promise<IGuildMember> {
    const entity = this.repo.create(data as GuildMemberEntity)
    return this.repo.save(entity)
  }

  /**
   * Atualiza o papel de um membro pelo UUID do vínculo.
   *
   * @param id - UUID da linha em guild_members
   * @param role - Novo papel (MASTER, VICE_MASTER, ELITE, MEMBER)
   */
  async updateRole(id: string, role: GuildMemberRole): Promise<IGuildMember> {
    await this.repo.update(id, { role })
    return this.repo.findOneOrFail({ where: { id } })
  }

  /**
   * Incrementa atomicamente o contribution_xp do membro.
   * Usado pelo listener do evento `activity.completed`.
   *
   * @param memberId - UUID do vínculo guild_members
   * @param xp - XP ganho na atividade
   */
  async addContribution(memberId: string, xp: number): Promise<void> {
    await this.repo.increment({ id: memberId }, 'contribution_xp', xp)
  }

  /**
   * Remove o vínculo pelo UUID, efetivando saída ou expulsão da guilda.
   *
   * @param id - UUID do vínculo guild_members
   */
  async removeMember(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  /**
   * Retorna os N membros com maior contribution_xp de uma guilda.
   * Usado no endpoint de leaderboard da guilda.
   *
   * @param guildId - UUID da guilda
   * @param limit - Número máximo de resultados (máx. 50)
   */
  async getTopContributors(guildId: string, limit: number): Promise<IGuildMember[]> {
    return this.repo.find({
      where: { guild_id: guildId },
      order: { contribution_xp: 'DESC' },
      take: limit,
    })
  }
}
