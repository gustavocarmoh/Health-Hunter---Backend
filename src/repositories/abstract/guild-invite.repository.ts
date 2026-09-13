import { IGuildInvite } from '../../common/interfaces/guild-invite.interface.js'
import { GuildInviteStatus } from '../../common/enums/guild.enum.js'

/**
 * Contrato abstrato para operações de convites de guilda.
 * Implementado por TypeOrmGuildInviteRepository.
 */
export abstract class GuildInviteRepository {
  /**
   * Persiste um novo convite de guilda.
   *
   * @param data - Dados do convite (guild_id, invited_user_id, invited_by_id, expires_at)
   * @returns O convite criado
   */
  abstract create(data: Partial<IGuildInvite>): Promise<IGuildInvite>

  /**
   * Busca um convite pelo UUID.
   *
   * @param id - UUID do convite
   * @returns O convite ou null se não encontrado
   */
  abstract findById(id: string): Promise<IGuildInvite | null>

  /**
   * Lista todos os convites pendentes endereçados a um hunter.
   *
   * @param userId - UUID do hunter convidado
   * @returns Array de convites com status PENDING
   */
  abstract findPendingByUserId(userId: string): Promise<IGuildInvite[]>

  /**
   * Busca convite pendente entre uma guilda e um hunter específico.
   * Usado para evitar convites duplicados.
   *
   * @param guildId - UUID da guilda
   * @param userId - UUID do hunter alvo
   * @returns O convite pendente ou null se não existir
   */
  abstract findByGuildAndUser(guildId: string, userId: string): Promise<IGuildInvite | null>

  /**
   * Atualiza o status de um convite (ACCEPTED, DECLINED, EXPIRED).
   *
   * @param id - UUID do convite
   * @param status - Novo status do convite
   * @returns O convite atualizado
   */
  abstract updateStatus(id: string, status: GuildInviteStatus): Promise<IGuildInvite>

  /**
   * Marca como EXPIRED todos os convites pendentes cujo `expires_at` já passou.
   * Chamado pelo job semanal do scheduler.
   */
  abstract expireOld(): Promise<void>
}
