import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm'
import { IFollow } from '../../common/interfaces/follow.interface'

@Entity('follows')
@Unique(['follower_id', 'following_id'])
@Index(['follower_id'])
@Index(['following_id'])
export class FollowEntity implements IFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  follower_id: string

  @Column('uuid')
  following_id: string

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date
}
