import { IAuditLog } from '../../common/interfaces/audit-log.interface.js'

/**
 * Contrato abstrato do repositório de logs de auditoria administrativa.
 */
export abstract class AuditLogRepository {
  /**
   * Persiste um novo registro de auditoria.
   * @param log - Dados do log sem `id` e `performed_at`
   * @returns `AuditLog` criado
   */
  abstract create(log: Omit<IAuditLog, 'id' | 'performed_at'>): Promise<IAuditLog>

  /**
   * Lista todos os registros de auditoria com paginação.
   * @param page - Página (início em 1)
   * @param limit - Itens por página
   * @returns Objeto com array `logs` e contagem `total`
   */
  abstract findAll(page: number, limit: number): Promise<{ logs: IAuditLog[]; total: number }>
}
