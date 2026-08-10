import { IActivityLog } from '../../common/interfaces/activity.interface'

/**
 * Contrato abstrato do repositório de logs de atividades.
 */
export abstract class ActivityRepository {
  /**
   * Persiste um novo registro de atividade física.
   * @param activity - Dados da atividade sem `id` e `logged_at`
   * @returns `ActivityLog` criado com todos os campos
   */
  abstract create(activity: Omit<IActivityLog, 'id' | 'logged_at'>): Promise<IActivityLog>

  /**
   * Lista atividades de um Hunter com paginação.
   * @param userId - UUID do Hunter
   * @param page - Página (início em 1)
   * @param limit - Itens por página
   * @returns Objeto com array `activities` e contagem `total`
   */
  abstract findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ activities: IActivityLog[]; total: number }>

  /**
   * Retorna todas as atividades de um Hunter sem paginação.
   *
   * Utilizado para cálculos de estatísticas agregadas.
   *
   * @param userId - UUID do Hunter
   * @returns Array completo de `ActivityLog`
   */
  abstract findAllByUserId(userId: string): Promise<IActivityLog[]>

  /** Retorna atividades de um Hunter registradas a partir de `since`. */
  abstract findByUserIdSince(userId: string, since: Date): Promise<IActivityLog[]>

  /** Conta o total de atividades registradas a partir de `since` (todos os hunters). */
  abstract countAll(since?: Date): Promise<number>

  /** Soma o XP ganho em todas as atividades a partir de `since`. */
  abstract sumXpAll(since?: Date): Promise<number>

  /** Busca uma atividade pelo UUID. */
  abstract findById(id: string): Promise<IActivityLog | null>

  /**
   * Retorna atividades recentes de múltiplos hunters (feed social).
   * @param userIds - Lista de UUIDs
   * @param limit - Máximo de itens
   */
  abstract findByUserIds(userIds: string[], limit: number): Promise<IActivityLog[]>

  /**
   * Retorna XP total acumulado por usuário em um período.
   * Usado para leaderboard de temporadas.
   */
  abstract getTopByXpInPeriod(
    startsAt: Date,
    endsAt: Date,
    limit: number,
  ): Promise<{ user_id: string; total_xp: number }[]>

  /** Atualiza uma atividade pelo UUID. */
  abstract update(id: string, data: Partial<IActivityLog>): Promise<IActivityLog>

  /** Deleta uma atividade pelo UUID. */
  abstract delete(id: string): Promise<void>
}
