import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { DailyMissionRepository } from '../../repositories/abstract/daily-mission.repository.js'

export interface Mission {
  id: string
  name: string
  category: string
  difficulty: string
  xp: number
  icon: string
  done: boolean
  daily: boolean
}

export const DAILY_MISSION_TEMPLATES = [
  {
    name: 'Corrida Matinal',
    category: 'RUNNING',
    difficulty: 'NORMAL',
    xp: 150,
    icon: '🏃',
  },
  {
    name: 'Treino Pesado',
    category: 'WORKOUT',
    difficulty: 'HARD',
    xp: 250,
    icon: '💪',
  },
  {
    name: 'Meditação Diária',
    category: 'MEDITATION',
    difficulty: 'EASY',
    xp: 100,
    icon: '🧘',
  },
  {
    name: 'Hidratação 2L',
    category: 'HYDRATION',
    difficulty: 'EASY',
    xp: 50,
    icon: '💧',
  },
  {
    name: 'Caminhada Noturna',
    category: 'WALKING',
    difficulty: 'NORMAL',
    xp: 120,
    icon: '🚶',
  },
  {
    name: 'Alongamento',
    category: 'STRETCHING',
    difficulty: 'EASY',
    xp: 75,
    icon: '🤸',
  },
  {
    name: 'Ioga Relaxante',
    category: 'YOGA',
    difficulty: 'NORMAL',
    xp: 130,
    icon: '🧘‍♀️',
  },
  {
    name: 'Treino HIIT',
    category: 'HIIT',
    difficulty: 'VERY_HARD',
    xp: 300,
    icon: '⚡',
  },
]

@Injectable()
export class MissionsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly dailyMissionRepository: DailyMissionRepository,
  ) {}

  async getMissionsForUser(userId: string): Promise<Mission[]> {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    return this.dailyMissionRepository.findByUserId(userId)
  }

  async generateDaily(userId: string): Promise<Mission[]> {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const existingMissions = await this.dailyMissionRepository.findByUserIdAndDate(userId, today)

    if (existingMissions.length > 0) {
      throw new ConflictException(
        'Você já gerou suas missões diárias hoje. Volte amanhã para gerar novas missões.',
      )
    }

    const count = Math.floor(Math.random() * 3) + 3
    const shuffled = DAILY_MISSION_TEMPLATES.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, count)

    const createdMissions = await Promise.all(
      selected.map((m) =>
        this.dailyMissionRepository.create({
          user_id: userId,
          name: m.name,
          category: m.category,
          difficulty: m.difficulty,
          xp: m.xp,
          icon: m.icon,
          done: false,
          daily: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      ),
    )

    return createdMissions.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      difficulty: m.difficulty,
      xp: m.xp,
      icon: m.icon,
      done: m.done,
      daily: m.daily,
    }))
  }

  async createIndividual(
    userId: string,
    data: {
      name: string
      category: string
      difficulty: string
      xp: number
      icon?: string
    },
  ): Promise<Mission> {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const created = await this.dailyMissionRepository.create({
      user_id: userId,
      name: data.name,
      category: data.category,
      difficulty: data.difficulty,
      xp: data.xp,
      icon: data.icon || '📋',
      done: false,
      daily: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    return {
      id: created.id,
      name: created.name,
      category: created.category,
      difficulty: created.difficulty,
      xp: created.xp,
      icon: created.icon,
      done: created.done,
      daily: created.daily,
    }
  }

  async updateMissionDone(userId: string, missionId: string, done: boolean): Promise<Mission> {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const mission = await this.dailyMissionRepository.findById(missionId)
    if (!mission || mission.user_id !== userId) {
      throw new NotFoundException('Missão não encontrada ou acesso negado.')
    }

    const wasDone = mission.done
    const xpDelta = done && !wasDone ? mission.xp : !done && wasDone ? -mission.xp : 0

    mission.done = done
    const updated = await this.dailyMissionRepository.save(mission)

    if (xpDelta !== 0) {
      const newXp = Math.max(0, user.xp + xpDelta)
      await this.userRepository.update(userId, { xp: newXp })
    }

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      difficulty: updated.difficulty,
      xp: updated.xp,
      icon: updated.icon,
      done: updated.done,
      daily: updated.daily,
    }
  }
}
