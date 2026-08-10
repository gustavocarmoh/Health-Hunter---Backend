import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { UserRepository } from '../../repositories/abstract/user.repository'
import { AuditLogRepository } from '../../repositories/abstract/audit-log.repository'
import { ChallengeRepository } from '../../repositories/abstract/challenge.repository'
import { EventRepository } from '../../repositories/abstract/event.repository'
import { ActivityRepository } from '../../repositories/abstract/activity.repository'
import { AchievementRepository } from '../../repositories/abstract/achievement.repository'
import { AssignRoleDto } from './dto/assign-role.dto'
import { AssignRankDto } from './dto/assign-rank.dto'
import { CreateChallengeDto } from './dto/create-challenge.dto'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { IAchievement } from '../../common/interfaces/achievement.interface'

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly challengeRepository: ChallengeRepository,
    private readonly eventRepository: EventRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly achievementRepository: AchievementRepository,
  ) {}

  /**
   * Lista todos os usuários com paginação e filtragem opcional por texto.
   *
   * A busca é feita em memória sobre `name` e `email` (case-insensitive).
   * O campo `password_hash` é removido de todos os registros retornados.
   *
   * @param page - Página da listagem (início em 1)
   * @param limit - Itens por página
   * @param search - Texto parcial para filtrar por nome ou e-mail
   * @returns Objeto com `total`, `page`, `limit` e array `users`
   */
  async getUsers(page: number, limit: number, search?: string) {
    const { users, total } = await this.userRepository.findAll(page, limit)
    const filtered = search
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()),
        )
      : users

    return {
      total,
      page,
      limit,
      users: filtered.map(({ password_hash: _pw, ...u }) => u),
    }
  }

  /**
   * Altera a Role de um usuário e registra a ação no log de auditoria.
   *
   * @param targetUserId - UUID do usuário alvo
   * @param adminId - UUID do administrador que realiza a ação (extraído do JWT)
   * @param dto - Nova Role a ser atribuída
   * @returns Mensagem de confirmação e `user_id`
   * @throws NotFoundException se o usuário alvo não for encontrado
   */
  async assignRole(targetUserId: string, adminId: string, dto: AssignRoleDto) {
    const user = await this.userRepository.findById(targetUserId)
    if (!user) throw new NotFoundException('Target user not found.')

    const oldValue = user.role
    await this.userRepository.update(targetUserId, { role: dto.role })

    await this.auditLogRepository.create({
      admin_id: adminId,
      target_user_id: targetUserId,
      action: 'ASSIGN_ROLE',
      old_value: oldValue,
      new_value: dto.role,
    })

    return { message: `Role updated to ${dto.role}.`, user_id: targetUserId }
  }

  /**
   * Altera o Rank de caçador de um Hunter manualmente e registra no log de auditoria.
   *
   * Utilizado em eventos especiais ou correções administrativas.
   *
   * @param targetUserId - UUID do Hunter alvo
   * @param adminId - UUID do administrador que realiza a ação
   * @param dto - Novo Rank a ser atribuído
   * @returns Mensagem de confirmação e `user_id`
   * @throws NotFoundException se o usuário alvo não for encontrado
   */
  async assignRank(targetUserId: string, adminId: string, dto: AssignRankDto) {
    const user = await this.userRepository.findById(targetUserId)
    if (!user) throw new NotFoundException('Target user not found.')

    const oldValue = user.rank_level
    await this.userRepository.update(targetUserId, {
      rank_level: dto.rank_level,
    })

    await this.auditLogRepository.create({
      admin_id: adminId,
      target_user_id: targetUserId,
      action: 'ASSIGN_RANK',
      old_value: oldValue,
      new_value: dto.rank_level,
    })

    return {
      message: `Rank updated to ${dto.rank_level}.`,
      user_id: targetUserId,
    }
  }

  /**
   * Cria um novo desafio gamificado (Quest ou Raid).
   *
   * Define `is_active` como `true` por padrão se não informado.
   *
   * @param dto - Dados do desafio (título, descrição, XP, rank mínimo...)
   * @returns Entidade `Challenge` persistida
   */
  async createChallenge(dto: CreateChallengeDto) {
    // Validação de regra de negócio: end_date deve ser posterior a start_date
    if (dto.start_date && dto.end_date) {
      if (new Date(dto.end_date) <= new Date(dto.start_date)) {
        throw new BadRequestException('end_date deve ser posterior a start_date')
      }
    }
    return this.challengeRepository.create({
      ...dto,
      is_active: dto.is_active ?? true,
    })
  }

  /**
   * Retorna o histórico paginado de todas as ações administrativas.
   *
   * @param page - Página da listagem
   * @param limit - Itens por página
   * @returns Lista paginada de `AuditLog`
   */
  async getAuditLogs(page: number, limit: number) {
    return this.auditLogRepository.findAll(page, limit)
  }

  async getStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalHunters, newThisWeek, activitiesToday, xpToday, activeEvents] = await Promise.all([
      this.userRepository.countActive(),
      this.userRepository.countNewSince(weekAgo),
      this.activityRepository.countAll(today),
      this.activityRepository.sumXpAll(today),
      this.eventRepository.countActive(),
    ])

    return {
      totalHunters,
      newThisWeek,
      activitiesToday,
      xpToday,
      activeEvents,
    }
  }

  async createEvent(dto: CreateEventDto, adminId: string) {
    if (new Date(dto.ends_at) <= new Date(dto.starts_at)) {
      throw new BadRequestException('ends_at must be after starts_at.')
    }

    const event = await this.eventRepository.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      region_filter: dto.region_filter ?? null,
      starts_at: new Date(dto.starts_at),
      ends_at: new Date(dto.ends_at),
      is_active: true,
      xp_cap_per_hunter: null,
    })

    await this.auditLogRepository.create({
      admin_id: adminId,
      target_user_id: null,
      action: 'CREATE_EVENT',
      old_value: null,
      new_value: event.id,
    })

    return event
  }

  async updateEvent(eventId: string, dto: UpdateEventDto, adminId: string) {
    const existing = await this.eventRepository.findById(eventId)
    if (!existing) throw new NotFoundException('Event not found.')

    if (dto.starts_at || dto.ends_at) {
      const starts = dto.starts_at ? new Date(dto.starts_at) : existing.starts_at
      const ends = dto.ends_at ? new Date(dto.ends_at) : existing.ends_at
      if (ends <= starts) {
        throw new BadRequestException('ends_at must be after starts_at.')
      }
    }

    const updated = await this.eventRepository.update(eventId, {
      ...dto,
      starts_at: dto.starts_at ? new Date(dto.starts_at) : undefined,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
    })

    await this.auditLogRepository.create({
      admin_id: adminId,
      target_user_id: null,
      action: 'UPDATE_EVENT',
      old_value: eventId,
      new_value: JSON.stringify(dto),
    })

    return updated
  }

  async getEventParticipants(eventId: string) {
    const event = await this.eventRepository.findById(eventId)
    if (!event) throw new NotFoundException('Event not found.')

    const participants = await this.eventRepository.getParticipantsWithUsers(eventId)
    return { event_id: eventId, total: participants.length, participants }
  }

  async hardDeleteUser(targetUserId: string, adminId: string) {
    const user = await this.userRepository.findById(targetUserId)
    if (!user) throw new NotFoundException('User not found.')

    await this.userRepository.delete(targetUserId)

    await this.auditLogRepository.create({
      admin_id: adminId,
      target_user_id: targetUserId,
      action: 'DELETE_USER',
      old_value: user.email,
      new_value: 'DELETED',
    })

    return { message: `User ${targetUserId} permanently deleted.` }
  }

  async getAllEvents(page: number, limit: number) {
    return this.eventRepository.findAll(page, limit)
  }

  async getAllChallenges(page: number, limit: number) {
    const all = await this.challengeRepository.findAll()
    const total = all.length
    const items = all.slice((page - 1) * limit, page * limit)
    return { total, page, limit, challenges: items }
  }

  async updateChallenge(challengeId: string, data: Record<string, unknown>, adminId: string) {
    const existing = await this.challengeRepository.findById(challengeId)
    if (!existing) throw new NotFoundException('Challenge not found.')

    const updated = await this.challengeRepository.update(challengeId, data as never)

    await this.auditLogRepository.create({
      admin_id: adminId,
      target_user_id: null,
      action: 'UPDATE_CHALLENGE',
      old_value: challengeId,
      new_value: JSON.stringify(data),
    })

    return updated
  }

  async createAchievement(data: Record<string, unknown>) {
    const title = data.title as string
    const description = data.description as string
    const condition_type = data.condition_type as string
    const condition_value = data.condition_value as number
    const xp_reward = (data.xp_reward as number) ?? 0
    const icon = (data.icon as string) ?? '🏆'
    const validConditionTypes = ['ACTIVITIES_COUNT', 'DISTANCE_KM', 'RANK_REACHED'] as const

    if (
      !title ||
      !description ||
      !condition_type ||
      condition_value === undefined ||
      !validConditionTypes.includes(condition_type as IAchievement['condition_type'])
    ) {
      throw new BadRequestException(
        'Required fields: title, description, condition_type, condition_value.',
      )
    }

    return this.achievementRepository.create({
      title,
      description,
      icon,
      condition_type: condition_type as IAchievement['condition_type'],
      condition_value,
      xp_reward,
    })
  }

  async deleteEvent(eventId: string, adminId: string) {
    const event = await this.eventRepository.findById(eventId)
    if (!event) throw new NotFoundException('Event not found.')

    await this.eventRepository.delete(eventId)

    await this.auditLogRepository.create({
      admin_id: adminId,
      target_user_id: null,
      action: 'DELETE_EVENT',
      old_value: event.title,
      new_value: 'DELETED',
    })

    return { message: `Event "${event.title}" permanently deleted.` }
  }
}
