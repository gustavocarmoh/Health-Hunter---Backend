import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { StoreItemRepository } from '../../repositories/abstract/store-item.repository'
import { HunterItemRepository } from '../../repositories/abstract/hunter-item.repository'
import { UserRepository } from '../../repositories/abstract/user.repository'
import { RedisService } from '../../cache/redis.service'

@Injectable()
export class StoreService {
  constructor(
    private readonly storeItemRepository: StoreItemRepository,
    private readonly hunterItemRepository: HunterItemRepository,
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
  ) {}

  async getItems() {
    return this.storeItemRepository.findAll()
  }

  async purchase(userId: string, itemId: string) {
    const item = await this.storeItemRepository.findById(itemId)
    if (!item || !item.is_available) throw new NotFoundException('Item not found or unavailable.')

    const alreadyOwned = await this.hunterItemRepository.findOne(userId, itemId)
    if (alreadyOwned) throw new ConflictException('You already own this item.')

    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')
    if (user.coins < item.price_coins) {
      throw new BadRequestException(
        `Insufficient coins. Required: ${item.price_coins}, available: ${user.coins}.`,
      )
    }

    await this.userRepository.update(userId, {
      coins: user.coins - item.price_coins,
    })
    const hunterItem = await this.hunterItemRepository.create({
      user_id: userId,
      item_id: itemId,
    })

    // Invalidate cached profile
    await this.redisService.del(`hunter:profile:${userId}`)

    return {
      message: 'Purchase successful.',
      coins_remaining: user.coins - item.price_coins,
      item: hunterItem,
    }
  }

  async getInventory(userId: string) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const hunterItems = await this.hunterItemRepository.findByUserId(userId)
    const inventory = await Promise.all(
      hunterItems.map(async (hi) => {
        const detail = await this.storeItemRepository.findById(hi.item_id)
        return { ...hi, item: detail }
      }),
    )

    return { total: inventory.length, inventory }
  }
}
