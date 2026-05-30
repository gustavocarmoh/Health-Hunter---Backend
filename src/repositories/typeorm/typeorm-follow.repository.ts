import { Injectable, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FollowEntity } from '../../database/entities/follow.entity'
import { FollowRepository } from '../abstract/follow.repository'
import { IFollow } from '../../common/interfaces/follow.interface'

@Injectable()
export class TypeOrmFollowRepository extends FollowRepository {
  constructor(
    @InjectRepository(FollowEntity)
    private readonly repo: Repository<FollowEntity>,
  ) {
    super()
  }

  async follow(followerId: string, followingId: string): Promise<IFollow> {
    const existing = await this.repo.findOne({
      where: { follower_id: followerId, following_id: followingId },
    })
    if (existing) throw new ConflictException('Already following this Hunter.')
    const entity = this.repo.create({
      follower_id: followerId,
      following_id: followingId,
    })
    return this.repo.save(entity)
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.repo.delete({
      follower_id: followerId,
      following_id: followingId,
    })
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.repo.count({
      where: { follower_id: followerId, following_id: followingId },
    })
    return count > 0
  }

  async findFollowingIds(userId: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { follower_id: userId },
      select: ['following_id'],
    })
    return rows.map((r) => r.following_id)
  }

  async findFollowerIds(userId: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { following_id: userId },
      select: ['follower_id'],
    })
    return rows.map((r) => r.follower_id)
  }

  async countFollowing(userId: string): Promise<number> {
    return this.repo.count({ where: { follower_id: userId } })
  }

  async countFollowers(userId: string): Promise<number> {
    return this.repo.count({ where: { following_id: userId } })
  }
}
