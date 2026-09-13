import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'
import { IAuditLog } from '../../common/interfaces/audit-log.interface.js'

@Entity('audit_logs')
@Index(['target_user_id'])
@Index(['performed_at'])
export class AuditLogEntity implements IAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  admin_id: string

  @Column('uuid', { nullable: true })
  target_user_id: string | null

  @Column({ length: 100 })
  action: string

  @Column({ type: 'text', nullable: true })
  old_value: string | null

  @Column({ type: 'text', default: '' })
  new_value: string

  @CreateDateColumn({ type: 'timestamptz' })
  performed_at: Date
}
