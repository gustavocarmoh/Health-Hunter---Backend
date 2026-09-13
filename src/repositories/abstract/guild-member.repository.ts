import { IGuildMember } from '../../common/interfaces/guild-member.interface.js'
import { GuildMemberRole } from '../../common/enums/guild.enum.js'

/**
 * Contrato abstrato para operações de membros de guildas.
 * Implementado por TypeOrmGuildMemberRepository.
 */
export abstract class GuildMemberRepository {
  /**
   * Lista todos os membros ativos de uma guilda.
   *
   * @param guildId - UUID da guilda
   * @returns Array de membros ordenados por contribution_xp DESC
   */
  abstract findByGuildId(guildId: string): Promise<IGuildMember[]>

  /**
   * Retorna o vínculo de guilda de um hunter.
   * Um hunter só pode pertencer a uma guilda por vez.
   *
   * @param userId - UUID do hunter
   * @returns O vínculo ou null se não pertencer a nenhuma guilda
   */
  abstract findByUserId(userId: string): Promise<IGuildMember | null>

  /**
   * Busca o vínculo específico entre guilda e hunter.
   *
   * @param guildId - UUID da guilda
   * @param userId - UUID do hunter
   * @returns O vínculo ou null se não existir
   */
  abstract findByGuildAndUser(guildId: string, userId: string): Promise<IGuildMember | null>

  /**
   * Conta o número atual de membros em uma guilda.
   *
   * @param guildId - UUID da guilda
   * @returns Contagem de membros ativos
   */
  abstract countByGuildId(guildId: string): Promise<number>

  /**
   * Adiciona um hunter como membro de uma guilda.
   *
   * @param data - Dados do vínculo (guild_id, user_id, role)
   * @returns O vínculo criado
   */
  abstract addMember(data: Partial<IGuildMember>): Promise<IGuildMember>

  /**
   * Atualiza o papel (role) de um membro existente.
   *
   * @param id - UUID do vínculo guild_members
   * @param role - Novo papel do membro
   * @returns O vínculo atualizado
   */
  abstract updateRole(id: string, role: GuildMemberRole): Promise<IGuildMember>

  /**
   * Incrementa o XP de contribuição de um membro e o XP total da guilda.
   * Chamado a cada atividade registrada pelo hunter.
   *
   * @param memberId - UUID do vínculo guild_members
   * @param xp - XP a acrescentar à contribuição
   */
  abstract addContribution(memberId: string, xp: number): Promise<void>

  /**
   * Remove o vínculo de um hunter com sua guilda.
   *
   * @param id - UUID do vínculo guild_members
   */
  abstract removeMember(id: string): Promise<void>

  /**
   * Lista os membros com maior contribution_xp de uma guilda.
   *
   * @param guildId - UUID da guilda
   * @param limit - Número máximo de resultados
   * @returns Array de membros ordenados por contribution_xp DESC
   */
  abstract getTopContributors(guildId: string, limit: number): Promise<IGuildMember[]>
}
