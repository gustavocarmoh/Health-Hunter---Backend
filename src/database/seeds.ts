import { AppDataSource } from './data-source.js'
import { UserEntity } from './entities/user.entity.js'
import { ChallengeEntity } from './entities/challenge.entity.js'
import { EventEntity } from './entities/event.entity.js'
import { StoreItemEntity } from './entities/store-item.entity.js'
import { GuildEntity } from './entities/guild.entity.js'
import { GuildMemberEntity } from './entities/guild-member.entity.js'
import { Role } from '../common/enums/role.enum.js'
import { HunterRank } from '../common/enums/rank.enum.js'
import { GuildMemberRole } from '../common/enums/guild.enum.js'
import * as bcrypt from 'bcrypt'

async function seed() {
  try {
    await AppDataSource.initialize()
    console.log('✅ Database connection established')

    const userRepo = AppDataSource.getRepository(UserEntity)
    const challengeRepo = AppDataSource.getRepository(ChallengeEntity)
    const eventRepo = AppDataSource.getRepository(EventEntity)
    const storeRepo = AppDataSource.getRepository(StoreItemEntity)
    const guildRepo = AppDataSource.getRepository(GuildEntity)
    const guildMemberRepo = AppDataSource.getRepository(GuildMemberEntity)

    console.log('🌱 Seeding users...')
    const users = []
    for (let i = 1; i <= 5; i++) {
      const passwordHash = await bcrypt.hash('password123', 10)
      const user = userRepo.create({
        email: `hunter${i}@example.com`,
        name: `Test Hunter ${i}`,
        password_hash: passwordHash,
        role: Role.USER,
        rank_level: [HunterRank.E, HunterRank.D, HunterRank.C, HunterRank.B, HunterRank.A][i % 5],
        xp: 5000 * i,
        coins: 1000 * i,
      })
      await userRepo.save(user)
      users.push(user)
      console.log(`  ✅ Created user: hunter${i}@example.com (password: password123)`)
    }

    console.log('🌱 Seeding guilds...')
    const guilds = []
    const guildData = [
      { name: 'Thunder Hunters', tag: 'THR', description: 'Elite fitness warriors', emblem: '⚡' },
      { name: 'Phoenix Squad', tag: 'PHX', description: 'Rising from the ashes', emblem: '🔥' },
      { name: 'Blade Masters', tag: 'BLD', description: 'Sharp and deadly training', emblem: '⚔️' },
    ]

    for (let i = 0; i < guildData.length; i++) {
      const guild = guildRepo.create({
        ...guildData[i],
        master_id: users[i].id,
        rank: HunterRank.B,
        xp: 5000 + i * 1000,
        is_public: true,
      })
      await guildRepo.save(guild)
      guilds.push(guild)

      const member = guildMemberRepo.create({
        guild_id: guild.id,
        user_id: users[i].id,
        role: GuildMemberRole.MASTER,
      })
      await guildMemberRepo.save(member)

      console.log(`  ✅ Created guild: ${guild.name} (Master: ${users[i].name})`)
    }

    console.log('🌱 Seeding challenges...')
    const challenges = [
      {
        title: 'Run 5km Daily',
        description: 'Run 5 kilometers every day this week',
        tipo_exercicio: 'RUNNING',
        xp_base: 500,
        coins_base: 250,
        min_rank_required: 'E',
      },
      {
        title: 'Drink 2L Water Daily',
        description: 'Stay hydrated with 2 liters of water daily',
        tipo_exercicio: 'HYDRATION',
        xp_base: 300,
        coins_base: 150,
        min_rank_required: 'E',
      },
      {
        title: 'Complete 30 Workouts',
        description: 'Finish 30 workout sessions',
        tipo_exercicio: 'WORKOUT',
        xp_base: 1500,
        coins_base: 750,
        min_rank_required: 'D',
      },
      {
        title: 'Meditate 30 Days',
        description: 'Meditate for at least 10 minutes each day',
        tipo_exercicio: 'MEDITATION',
        xp_base: 400,
        coins_base: 200,
        min_rank_required: 'E',
      },
    ]

    for (const c of challenges) {
      const challenge = challengeRepo.create(c)
      await challengeRepo.save(challenge)
    }
    console.log(`  ✅ Created ${challenges.length} challenges`)

    console.log('🌱 Seeding events...')
    const now = new Date()
    const events = [
      {
        title: 'Weekly Group Run',
        description: 'Join hunters from around the world for a coordinated run',
        type: 'RAID' as const,
        starts_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        ends_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        region_filter: null,
        xp_cap_per_hunter: 1000,
      },
      {
        title: 'Fitness Workshop',
        description: 'Learn tips and tricks from professional trainers',
        type: 'CAMPAIGN' as const,
        starts_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        ends_at: new Date(now.getTime() + 5.5 * 24 * 60 * 60 * 1000),
        region_filter: null,
        xp_cap_per_hunter: 500,
      },
      {
        title: 'Nutrition Challenge',
        description: 'Eat healthy for 7 days and earn special rewards',
        type: 'CAMPAIGN' as const,
        starts_at: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        ends_at: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        region_filter: null,
        xp_cap_per_hunter: 800,
      },
    ]

    for (const e of events) {
      const event = eventRepo.create(e)
      await eventRepo.save(event)
    }
    console.log(`  ✅ Created ${events.length} events`)

    console.log('🌱 Seeding store items...')
    const items = [
      {
        name: 'Premium Badge',
        description: 'Showcase your status with a premium badge',
        type: 'COSMETIC' as const,
        price_coins: 500,
        icon: '🎖️',
      },
      {
        name: 'Golden Title',
        description: 'Flaunt your achievements with a golden title',
        type: 'TITLE' as const,
        price_coins: 300,
        icon: '👑',
      },
      {
        name: 'Legendary Frame',
        description: 'Display your profile with a legendary frame',
        type: 'FRAME' as const,
        price_coins: 2000,
        icon: '⚔️',
      },
      {
        name: 'Elite Icon',
        description: 'Stand out with an exclusive elite icon',
        type: 'ICON' as const,
        price_coins: 150,
        icon: '🚀',
      },
    ]

    for (const item of items) {
      const storeItem = storeRepo.create(item)
      await storeRepo.save(storeItem)
    }
    console.log(`  ✅ Created ${items.length} store items`)

    console.log('\n✅ Seeding completed successfully!\n')
    console.log('📝 Test Credentials for Mobile Login:')
    console.log('  Email: hunter1@example.com')
    console.log('  Password: password123\n')
    console.log('  Email: hunter2@example.com')
    console.log('  Password: password123\n')
    console.log('🎯 Ready to test registration and login flows!\n')

    await AppDataSource.destroy()
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()
