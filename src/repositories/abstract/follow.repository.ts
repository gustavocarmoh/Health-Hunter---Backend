import { IFollow } from '../../common/interfaces/follow.interface.js'

export abstract class FollowRepository {
  abstract follow(followerId: string, followingId: string): Promise<IFollow>

  abstract unfollow(followerId: string, followingId: string): Promise<void>

  abstract isFollowing(followerId: string, followingId: string): Promise<boolean>

  abstract findFollowingIds(userId: string): Promise<string[]>

  /** Retorna IDs de quem segue o usuário. */
  abstract findFollowerIds(userId: string): Promise<string[]>

  abstract countFollowing(userId: string): Promise<number>
  abstract countFollowers(userId: string): Promise<number>
}
