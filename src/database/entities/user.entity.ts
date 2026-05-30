import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Role } from '../../common/enums/role.enum'
import { HunterRank } from '../../common/enums/rank.enum'
import { LifestyleType } from '../../common/enums/lifestyle.enum'
import { IUser } from '../../common/interfaces/user.interface'

@Entity('users')
export class UserEntity implements IUser {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true, length: 255 })
  email: string

  @Column({ length: 255 })
  password_hash: string

  @Column({ length: 100 })
  name: string

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role

  @Column({ type: 'enum', enum: HunterRank, default: HunterRank.E })
  rank_level: HunterRank

  @Column({ type: 'int', default: 0 })
  xp: number

  @Column({ type: 'int', default: 0 })
  coins: number

  @Column({ type: 'enum', enum: LifestyleType, default: LifestyleType.CASUAL })
  lifestyle: LifestyleType

  @Column({ length: 100, default: '' })
  region_state: string

  @Column({ length: 100, default: '' })
  region_country: string

  @Column({ length: 100, default: '' })
  city: string

  @Column({ default: false })
  is_deleted: boolean

  @Column({ type: 'timestamptz', nullable: true, default: null })
  anonymized_at: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date
}
