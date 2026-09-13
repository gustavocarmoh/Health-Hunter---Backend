import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'
import { IActivityLog, IGpsCoordinates } from '../../common/interfaces/activity.interface.js'

@Entity('activity_logs')
@Index(['user_id', 'logged_at'])
export class ActivityLogEntity implements IActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  user_id: string

  @Column({ type: 'float' })
  distancia_m: number

  @Column({ type: 'int' })
  duracao_seg: number

  @Column({ length: 100 })
  tipo_exercicio: string

  @Column({ type: 'jsonb' })
  coordenadas_gps: IGpsCoordinates

  @Column({ type: 'int' })
  bpm_medio: number

  @Column({ type: 'int' })
  xp_gained: number

  @Column({ type: 'int' })
  coins_gained: number

  @CreateDateColumn({ type: 'timestamptz' })
  logged_at: Date
}
