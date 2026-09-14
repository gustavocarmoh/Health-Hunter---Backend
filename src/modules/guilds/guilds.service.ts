import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { GuildRepository } from '../../repositories/abstract/guild.repository.js'
import { GuildMemberRepository } from '../../repositories/abstract/guild-member.repository.js'
import { GuildInviteRepository } from '../../repositories/abstract/guild-invite.repository.js'
import { UserRepository } from '../../repositories/abstract/user.repository.js'
import { RedisService } from '../../cache/redis.service.js'
import {
  GuildMemberRole,
  GuildInviteStatus,
  GUILD_MAX_MEMBERS,
  GUILD_XP_BONUS_PCT,
  GUILD_CREATE_MIN_RANK,
  GUILD_INVITE_TTL_DAYS,
  computeGuildRank,
} from '../../common/enums/guild.enum.js'
import { RANK_ORDER } from '../../common/enums/rank.enum.js'

interface CreateGuildInput {
  name: string
  tag: string
  description?: string
  emblem?: string
  is_public?: boolean
}

@Injectable()
export class GuildsService {
  constructor(
    private readonly guildRepository: GuildRepository,
    private readonly memberRepository: GuildMemberRepository,
    private readonly inviteRepository: GuildInviteRepository,
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
  ) {}

  async createGuild(userId: string, input: CreateGuildInput) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const userRankIndex = RANK_ORDER.indexOf(user.rank_level)
    const minRankIndex = RANK_ORDER.indexOf(GUILD_CREATE_MIN_RANK)
    if (userRankIndex < minRankIndex) {
      throw new BadRequestException(
        `Rank mínimo para criar uma guilda: ${GUILD_CREATE_MIN_RANK}. Seu rank atual: ${user.rank_level}.`,
      )
    }

    const existing = await this.guildRepository.findByMasterId(userId)
    if (existing) {
      throw new ConflictException(
        'Você já é mestre de uma guilda. Dissolva-a antes de criar outra.',
      )
    }

    const membership = await this.memberRepository.findByUserId(userId)
    if (membership) {
      throw new ConflictException('Saia da sua guilda atual antes de criar uma nova.')
    }

    const guild = await this.guildRepository.create({
      name: input.name,
      tag: input.tag.toUpperCase(),
      description: input.description ?? null,
      emblem: input.emblem ?? '⚔️',
      master_id: userId,
      is_public: input.is_public ?? true,
    })

    await this.memberRepository.addMember({
      guild_id: guild.id,
      user_id: userId,
      role: GuildMemberRole.MASTER,
    })

    return guild
  }

  async listGuilds(page: number, limit: number, search?: string) {
    const { guilds, total } = await this.guildRepository.findAll(page, limit, search)

    return {
      guilds: guilds.map((g) => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        level: 1, // Guild level (static for now)
        memberCount: 0, // TODO: Count guild members from database
      })),
      total,
    }
  }

  async getGuild(guildId: string) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')

    const members = await this.memberRepository.findByGuildId(guildId)
    const userIds = members.map((m) => m.user_id)
    const users = userIds.length > 0 ? await this.userRepository.findByIds(userIds) : []
    const userMap = new Map(users.map((u) => [u.id, u]))

    return {
      ...guild,
      member_count: members.length,
      max_members: GUILD_MAX_MEMBERS[guild.rank],
      xp_bonus_pct: GUILD_XP_BONUS_PCT[guild.rank],
      members: members.map((m) => {
        const u = userMap.get(m.user_id)
        return {
          user_id: m.user_id,
          name: u?.name ?? 'Unknown',
          rank_level: u?.rank_level ?? null,
          role: m.role,
          contribution_xp: m.contribution_xp,
          joined_at: m.joined_at,
        }
      }),
    }
  }

  async getMyGuild(userId: string) {
    const membership = await this.memberRepository.findByUserId(userId)
    if (!membership) return { guild: null, membership: null }

    const guild = await this.guildRepository.findById(membership.guild_id)
    if (!guild) return { guild: null, membership: null }

    return { guild, membership }
  }

  async getMyGuildMembers(userId: string) {
    const membership = await this.memberRepository.findByUserId(userId)
    if (!membership) return []

    const members = await this.memberRepository.findByGuildId(membership.guild_id)
    const userIds = members.map((m) => m.user_id)
    const users = await this.userRepository.findByIds(userIds)
    const userMap = new Map(users.map((u) => [u.id, u]))

    return members.map((m) => ({
      user_id: m.user_id,
      name: userMap.get(m.user_id)?.name || 'Unknown',
      role: m.role,
      xp: m.contribution_xp || 0,
    }))
  }

  async updateGuild(guildId: string, userId: string, data: Record<string, unknown>) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')
    if (guild.master_id !== userId)
      throw new ForbiddenException('Apenas o mestre pode editar a guilda.')

    // A tag não pode ser alterada após a criação.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tag: _removed, ...safeData } = data as Record<string, unknown> & {
      tag?: unknown
    }
    return this.guildRepository.update(guildId, safeData as never)
  }

  async disbandGuild(guildId: string, userId: string) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')
    if (guild.master_id !== userId)
      throw new ForbiddenException('Apenas o mestre pode dissolver a guilda.')

    const members = await this.memberRepository.findByGuildId(guildId)
    await Promise.all(members.map((m) => this.memberRepository.removeMember(m.id)))
    await this.guildRepository.disband(guildId)
    await this.redisService.del(`guild:${guildId}`)

    return { message: `Guilda "${guild.name}" dissolvida.` }
  }

  async inviteMember(guildId: string, inviterId: string, targetUserId: string) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')

    const inviterMembership = await this.memberRepository.findByGuildAndUser(guildId, inviterId)
    if (
      !inviterMembership ||
      ![GuildMemberRole.MASTER, GuildMemberRole.VICE_MASTER].includes(inviterMembership.role)
    ) {
      throw new ForbiddenException('Apenas MASTER ou VICE_MASTER podem convidar membros.')
    }

    const count = await this.memberRepository.countByGuildId(guildId)
    if (count >= GUILD_MAX_MEMBERS[guild.rank]) {
      throw new BadRequestException(
        `A guilda atingiu a capacidade máxima (${GUILD_MAX_MEMBERS[guild.rank]} membros) para o rank ${guild.rank}.`,
      )
    }

    const target = await this.userRepository.findById(targetUserId)
    if (!target || target.is_deleted) throw new NotFoundException('Hunter não encontrado.')

    const existingMembership = await this.memberRepository.findByUserId(targetUserId)
    if (existingMembership) throw new ConflictException('Hunter já pertence a uma guilda.')

    const duplicate = await this.inviteRepository.findByGuildAndUser(guildId, targetUserId)
    if (duplicate) throw new ConflictException('Já existe um convite pendente para este hunter.')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + GUILD_INVITE_TTL_DAYS)

    return this.inviteRepository.create({
      guild_id: guildId,
      invited_user_id: targetUserId,
      invited_by_id: inviterId,
      expires_at: expiresAt,
    })
  }

  async respondToInvite(inviteId: string, userId: string, accept: boolean) {
    const invite = await this.inviteRepository.findById(inviteId)
    if (!invite) throw new NotFoundException('Convite não encontrado.')
    if (invite.invited_user_id !== userId)
      throw new ForbiddenException('Este convite não é para você.')
    if (invite.status !== GuildInviteStatus.PENDING) {
      throw new BadRequestException(`Convite já foi ${invite.status.toLowerCase()}.`)
    }
    if (invite.expires_at < new Date()) {
      await this.inviteRepository.updateStatus(inviteId, GuildInviteStatus.EXPIRED)
      throw new BadRequestException('Este convite expirou.')
    }

    if (!accept) {
      await this.inviteRepository.updateStatus(inviteId, GuildInviteStatus.DECLINED)
      return { message: 'Convite recusado.' }
    }

    const guild = await this.guildRepository.findById(invite.guild_id)
    if (!guild) throw new NotFoundException('A guilda foi dissolvida.')

    const count = await this.memberRepository.countByGuildId(guild.id)
    if (count >= GUILD_MAX_MEMBERS[guild.rank]) {
      throw new BadRequestException('A guilda atingiu a capacidade máxima. Convite inválido.')
    }

    const existing = await this.memberRepository.findByUserId(userId)
    if (existing) throw new ConflictException('Você já pertence a uma guilda.')

    await this.inviteRepository.updateStatus(inviteId, GuildInviteStatus.ACCEPTED)
    const member = await this.memberRepository.addMember({
      guild_id: guild.id,
      user_id: userId,
      role: GuildMemberRole.MEMBER,
    })

    return { message: `Bem-vindo à guilda ${guild.name}!`, membership: member }
  }

  async joinGuild(guildId: string, userId: string) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')
    if (!guild.is_public) throw new BadRequestException('Esta guilda é privada.')

    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    const existing = await this.memberRepository.findByUserId(userId)
    if (existing) throw new ConflictException('Você já pertence a uma guilda.')

    await this.memberRepository.addMember({
      guild_id: guildId,
      user_id: userId,
      role: GuildMemberRole.MEMBER,
    })

    await this.redisService.del(`guild:${guildId}`)
    await this.redisService.del(`hunter:guild:${userId}`)

    return { message: 'Entrou na guilda com sucesso.', guild_id: guildId }
  }

  async leaveGuild(userId: string) {
    const membership = await this.memberRepository.findByUserId(userId)
    if (!membership) throw new NotFoundException('Você não pertence a nenhuma guilda.')
    if (membership.role === GuildMemberRole.MASTER) {
      throw new BadRequestException(
        'O mestre não pode sair da guilda. Transfira a liderança ou dissolva a guilda.',
      )
    }

    await this.memberRepository.removeMember(membership.id)
    return { message: 'Você saiu da guilda.' }
  }

  async kickMember(guildId: string, kickerId: string, targetUserId: string) {
    if (kickerId === targetUserId) throw new BadRequestException('Use /leave para sair da guilda.')

    const kickerMembership = await this.memberRepository.findByGuildAndUser(guildId, kickerId)
    if (
      !kickerMembership ||
      ![GuildMemberRole.MASTER, GuildMemberRole.VICE_MASTER].includes(kickerMembership.role)
    ) {
      throw new ForbiddenException('Apenas MASTER ou VICE_MASTER podem expulsar membros.')
    }

    const targetMembership = await this.memberRepository.findByGuildAndUser(guildId, targetUserId)
    if (!targetMembership) throw new NotFoundException('Membro não encontrado nesta guilda.')

    if (
      kickerMembership.role === GuildMemberRole.VICE_MASTER &&
      targetMembership.role === GuildMemberRole.MASTER
    ) {
      throw new ForbiddenException('Vice-mestre não pode expulsar o mestre.')
    }

    await this.memberRepository.removeMember(targetMembership.id)
    return { message: 'Membro expulso da guilda.' }
  }

  async updateMemberRole(
    guildId: string,
    masterId: string,
    targetUserId: string,
    newRole: GuildMemberRole,
  ) {
    if (newRole === GuildMemberRole.MASTER) {
      throw new BadRequestException('Use o endpoint de transferência para mudar o mestre.')
    }

    const masterMembership = await this.memberRepository.findByGuildAndUser(guildId, masterId)
    if (!masterMembership || masterMembership.role !== GuildMemberRole.MASTER) {
      throw new ForbiddenException('Apenas o mestre pode alterar papéis.')
    }

    const targetMembership = await this.memberRepository.findByGuildAndUser(guildId, targetUserId)
    if (!targetMembership) throw new NotFoundException('Membro não encontrado nesta guilda.')

    return this.memberRepository.updateRole(targetMembership.id, newRole)
  }

  async transferLeadership(guildId: string, currentMasterId: string, newMasterId: string) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')
    if (guild.master_id !== currentMasterId) {
      throw new ForbiddenException('Apenas o mestre atual pode transferir a liderança.')
    }

    const newMasterMembership = await this.memberRepository.findByGuildAndUser(guildId, newMasterId)
    if (!newMasterMembership) throw new NotFoundException('Novo mestre não é membro desta guilda.')

    const oldMasterMembership = await this.memberRepository.findByGuildAndUser(
      guildId,
      currentMasterId,
    )

    await Promise.all([
      this.memberRepository.updateRole(newMasterMembership.id, GuildMemberRole.MASTER),
      oldMasterMembership
        ? this.memberRepository.updateRole(oldMasterMembership.id, GuildMemberRole.VICE_MASTER)
        : Promise.resolve(),
      this.guildRepository.update(guildId, { master_id: newMasterId }),
    ])

    return { message: 'Liderança transferida com sucesso.' }
  }

  async getGuildLeaderboard(guildId: string, limit: number) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')

    const top = await this.memberRepository.getTopContributors(guildId, limit)
    const userIds = top.map((m) => m.user_id)
    const users = userIds.length > 0 ? await this.userRepository.findByIds(userIds) : []
    const userMap = new Map(users.map((u) => [u.id, u]))

    return {
      guild_id: guildId,
      guild_name: guild.name,
      guild_rank: guild.rank,
      leaderboard: top.map((m, i) => {
        const u = userMap.get(m.user_id)
        return {
          position: i + 1,
          user_id: m.user_id,
          name: u?.name ?? 'Unknown',
          rank_level: u?.rank_level ?? null,
          role: m.role,
          contribution_xp: m.contribution_xp,
        }
      }),
    }
  }

  async getMyInvites(userId: string) {
    const invites = await this.inviteRepository.findPendingByUserId(userId)

    const guildIds = [...new Set(invites.map((i) => i.guild_id))]
    const guilds = await Promise.all(guildIds.map((id) => this.guildRepository.findById(id)))
    const guildMap = new Map(guilds.filter(Boolean).map((g) => [g!.id, g!]))

    return invites.map((inv) => ({
      invite_id: inv.id,
      guild: guildMap.get(inv.guild_id) ?? null,
      invited_by_id: inv.invited_by_id,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
    }))
  }

  @OnEvent('activity.completed')
  async handleActivityContribution(payload: {
    activity: { xp_gained: number }
    hunter_id: string
  }): Promise<void> {
    const membership = await this.memberRepository.findByUserId(payload.hunter_id)
    if (!membership) return

    await this.memberRepository.addContribution(membership.id, payload.activity.xp_gained)

    const guild = await this.guildRepository.findById(membership.guild_id)
    if (!guild) return

    const newGuildXp = guild.xp + payload.activity.xp_gained
    const newRank = computeGuildRank(newGuildXp)

    const updates: Partial<typeof guild> = { xp: newGuildXp }
    if (newRank !== guild.rank) updates.rank = newRank

    await this.guildRepository.update(guild.id, updates)
    await this.redisService.del(`guild:${guild.id}`)
  }
}
