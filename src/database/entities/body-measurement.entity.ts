import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Index(['user_id'])
@Entity('body_measurements')
export class BodyMeasurementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  user_id: string

  @Column({ type: 'float', nullable: true })
  weight_kg: number | null

  @Column({ type: 'float', nullable: true })
  height_cm: number | null

  @Column({ type: 'float', nullable: true })
  body_fat_pct: number | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  measured_at: Date

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
