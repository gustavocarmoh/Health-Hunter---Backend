import { IUser } from '../../common/interfaces/user.interface.js'

/**
 * Contrato abstrato do repositório de usuários.
 *
 * Permite trocar a implementação de persistência (TypeORM, in-memory, etc.)
 * sem alterar a lógica de negócio dos serviços.
 */
export abstract class UserRepository {
  /**
   * Busca um usuário pelo seu UUID primário.
   * @param id - UUID do usuário
   * @returns Usuário encontrado ou `null`
   */
  abstract findById(id: string): Promise<IUser | null>

  /**
   * Busca um usuário pelo e-mail (case-insensitive na implementação).
   * @param email - E-mail do usuário
   * @returns Usuário encontrado ou `null`
   */
  abstract findByEmail(email: string): Promise<IUser | null>

  /**
   * Persiste um novo usuário.
   * @param user - Dados do usuário sem `id`, `created_at` e `updated_at`
   * @returns Usuário criado com todos os campos
   */
  abstract create(user: Omit<IUser, 'id' | 'created_at' | 'updated_at'>): Promise<IUser>

  /**
   * Atualiza campos parciais de um usuário.
   * @param id - UUID do usuário
   * @param data - Campos a atualizar (parcial de `IUser`)
   * @returns Usuário atualizado ou `null` se não encontrado
   */
  abstract update(id: string, data: Partial<IUser>): Promise<IUser | null>

  /**
   * Remove permanentemente um usuário do banco.
   * @param id - UUID do usuário
   */
  abstract delete(id: string): Promise<void>

  /**
   * Lista todos os usuários com paginação.
   * @param page - Número da página (início em 1)
   * @param limit - Quantidade máxima de registros
   * @returns Objeto com array `users` e contagem `total`
   */
  abstract findAll(page: number, limit: number): Promise<{ users: IUser[]; total: number }>

  /**
   * Retorna os top N hunters por XP para compor leaderboards.
   *
   * Filtros opcionais permitem escopo regional ou local.
   * A implementação deve ordenar por XP DESC na camada de banco.
   *
   * @param filter - Filtros opcionais: `region_state`, `region_country`, `city`
   * @param limit - Número máximo de registros a retornar (ex: 100)
   * @returns Array de hunters ordenados por XP descendente
   */
  abstract findLeaderboard(
    filter: { region_state?: string; region_country?: string; city?: string },
    limit: number,
  ): Promise<IUser[]>

  /**
   * Retorna hunters para o leaderboard usando paginação por cursor (keyset).
   *
   * Evita degradação de performance do OFFSET em tabelas grandes.
   * O cursor é composto por `(xp, id)` para garantir ordem estável mesmo com XP empatado.
   *
   * @param filter - Filtros opcionais de escopo geográfico
   * @param limit - Quantidade de registros por página (máx 100)
   * @param cursor - Cursor da página anterior: `{ xp, id }` do último item retornado
   * @returns Array de hunters e cursor para a próxima página (null se última página)
   */
  abstract findLeaderboardCursor(
    filter: { region_state?: string; region_country?: string; city?: string },
    limit: number,
    cursor?: { xp: number; id: string },
  ): Promise<{ data: IUser[]; nextCursor: { xp: number; id: string } | null }>

  /** Busca múltiplos usuários por lista de IDs. */
  abstract findByIds(ids: string[]): Promise<IUser[]>

  /** Busca hunters por nome contendo a query (case-insensitive, excluindo deletados). */
  abstract findByNameContains(query: string, limit: number): Promise<IUser[]>

  /** Conta hunters ativos (não deletados). */
  abstract countActive(): Promise<number>

  /** Conta hunters criados desde `since`. */
  abstract countNewSince(since: Date): Promise<number>

  /** Conta hunters com XP maior que o do usuário informado (para posição no ranking). */
  abstract countWithMoreXp(
    xp: number,
    filter: { region_state?: string; region_country?: string; city?: string },
  ): Promise<number>

  /** Retorna hunters da mesma região/rank excluindo IDs informados (sugestões de seguidores). */
  abstract findSuggested(
    region_state: string,
    rank_level: string,
    excludeIds: string[],
    limit: number,
  ): Promise<IUser[]>
}
