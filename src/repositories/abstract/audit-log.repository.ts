import { IAuditLog } from '../../common/interfaces/audit-log.interface.js'

export abstract class AuditLogRepository {
  abstract create(log: Omit<IAuditLog, 'id' | 'performed_at'>): Promise<IAuditLog>

  abstract findAll(page: number, limit: number): Promise<{ logs: IAuditLog[]; total: number }>
}
