import { IGuild } from '../../common/interfaces/guild.interface'

/**
 * Contrato abstrato para operações de persistência de guildas.
 * Implementado por TypeOrmGuildRepository.
 */
export abstract class GuildRepository {
  /**
   * Busca uma guilda pelo seu UUID.
   *
   * @param id - UUID da guilda
   * @returns A guilda ou null se não encontrada / disbandada
   */
  abstract findById(id: string): Promise<IGuild | null>

  /**
   * Lista guildas públicas ativas com suporte a busca por nome/tag.
   *
   * @param page - Página atual (1-indexed)
   * @param limit - Itens por página
   * @param search - Termo opcional para filtrar por nome ou tag
   * @returns Objeto com array de guildas e total de resultados
   */
  abstract findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ guilds: IGuild[]; total: number }>

  /**
   * Busca a guilda onde o hunter informado é mestre.
   *
   * @param masterId - UUID do hunter mestre
   * @returns A guilda ou null se o hunter não for mestre de nenhuma
   */
  abstract findByMasterId(masterId: string): Promise<IGuild | null>

  /**
   * Persiste uma nova guilda no banco.
   *
   * @param data - Campos obrigatórios e opcionais da guilda
   * @returns A guilda criada com todos os campos preenchidos
   */
  abstract create(data: Partial<IGuild>): Promise<IGuild>

  /**
   * Atualiza campos de uma guilda existente.
   *
   * @param id - UUID da guilda
   * @param data - Campos a atualizar (parcial)
   * @returns A guilda atualizada ou null se não encontrada
   */
  abstract update(id: string, data: Partial<IGuild>): Promise<IGuild | null>

  /**
   * Marca a guilda como disbandada (soft delete).
   * Não remove o registro para preservar histórico de membros.
   *
   * @param id - UUID da guilda a ser dissolvida
   */
  abstract disband(id: string): Promise<void>
}
