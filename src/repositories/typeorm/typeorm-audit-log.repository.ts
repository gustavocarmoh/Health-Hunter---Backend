import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLogEntity } from '../../database/entities/audit-log.entity.js'
import { AuditLogRepository } from '../abstract/audit-log.repository.js'
import { IAuditLog } from '../../common/interfaces/audit-log.interface.js'

@Injectable()
export class TypeOrmAuditLogRepository extends AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {
    super()
  }

  async create(logData: Omit<IAuditLog, 'id' | 'performed_at'>): Promise<IAuditLog> {
    const entity = this.repo.create(logData as Partial<AuditLogEntity>)
    return this.repo.save(entity)
  }

  async findAll(page: number, limit: number): Promise<{ logs: IAuditLog[]; total: number }> {
    const [logs, total] = await this.repo.findAndCount({
      order: { performed_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { logs, total }
  }
}
