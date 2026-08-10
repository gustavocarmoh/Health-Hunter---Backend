import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { GuildRepository } from '../../repositories/abstract/guild.repository'
import { GuildMemberRepository } from '../../repositories/abstract/guild-member.repository'
import { GuildInviteRepository } from '../../repositories/abstract/guild-invite.repository'
import { UserRepository } from '../../repositories/abstract/user.repository'
import { RedisService } from '../../cache/redis.service'
import {
  GuildMemberRole,
  GuildInviteStatus,
  GUILD_MAX_MEMBERS,
  GUILD_XP_BONUS_PCT,
  GUILD_CREATE_MIN_RANK,
  GUILD_INVITE_TTL_DAYS,
  computeGuildRank,
} from '../../common/enums/guild.enum'
import { RANK_ORDER } from '../../common/enums/rank.enum'

/** Dados mínimos para criar uma guilda */
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

  /**
   * Cria uma nova guilda e adiciona o criador como MASTER.
   *
   * Regras:
   * - O hunter precisa ter rank mínimo C (GUILD_CREATE_MIN_RANK).
   * - Um hunter só pode ser mestre de uma guilda por vez.
   * - A tag deve ser única no sistema.
   *
   * @param userId - UUID do hunter fundador
   * @param input - Dados da guilda (nome, tag, descrição, emblema)
   * @returns A guilda criada com o membro MASTER inicial
   * @throws BadRequestException se o rank for insuficiente
   * @throws ConflictException se já for mestre de outra guilda
   */
  async createGuild(userId: string, input: CreateGuildInput) {
    const user = await this.userRepository.findById(userId)
    if (!user || user.is_deleted) throw new NotFoundException('Hunter not found.')

    // Rank mínimo
    const userRankIndex = RANK_ORDER.indexOf(user.rank_level)
    const minRankIndex = RANK_ORDER.indexOf(GUILD_CREATE_MIN_RANK)
    if (userRankIndex < minRankIndex) {
      throw new BadRequestException(
        `Rank mínimo para criar uma guilda: ${GUILD_CREATE_MIN_RANK}. Seu rank atual: ${user.rank_level}.`,
      )
    }

    // Já é mestre de outra guilda?
    const existing = await this.guildRepository.findByMasterId(userId)
    if (existing) {
      throw new ConflictException(
        'Você já é mestre de uma guilda. Dissolva-a antes de criar outra.',
      )
    }

    // Hunter já pertence a uma guilda?
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

    // Mestre é o primeiro membro
    await this.memberRepository.addMember({
      guild_id: guild.id,
      user_id: userId,
      role: GuildMemberRole.MASTER,
    })

    return guild
  }

  /**
   * Lista guildas públicas ativas com pesquisa opcional por nome/tag.
   *
   * @param page - Página (1-indexed)
   * @param limit - Itens por página
   * @param search - Termo de busca (opcional)
   * @returns Objeto paginado com guildas e total
   */
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

  /**
   * Retorna o perfil completo de uma guilda com lista de membros e seus dados públicos.
   *
   * @param guildId - UUID da guilda
   * @returns Perfil da guilda com array de membros enriquecido com dados do hunter
   * @throws NotFoundException se a guilda não existir ou estiver disbandada
   */
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

  /**
   * Retorna a guilda do hunter autenticado com seu papel atual.
   * Retorna null se o hunter não pertencer a nenhuma guilda.
   *
   * @param userId - UUID do hunter
   */
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

  /**
   * Atualiza dados da guilda. Apenas o MASTER pode executar esta ação.
   *
   * Campos editáveis: name, description, emblem, is_public.
   * A tag não pode ser alterada após a criação.
   *
   * @param guildId - UUID da guilda
   * @param userId - UUID do solicitante (deve ser o MASTER)
   * @param data - Campos a atualizar
   * @returns A guilda atualizada
   * @throws ForbiddenException se o solicitante não for o MASTER
   */
  async updateGuild(guildId: string, userId: string, data: Record<string, unknown>) {
    const guild = await this.guildRepository.findById(guildId)
    if (!guild) throw new NotFoundException('Guilda não encontrada.')
    if (guild.master_id !== userId)
      throw new ForbiddenException('Apenas o mestre pode editar a guilda.')

    // tag não é editável
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tag: _removed, ...safeData } = data as Record<string, unknown> & {
      tag?: unknown
    }
    return this.guildRepository.update(guildId, safeData as never)
  }

  /**
   * Dissolve a guilda permanentemente. Apenas o MASTER pode executar.
   * Remove todos os membros e marca a guilda como disbandada.
   *
   * @param guildId - UUID da guilda
   * @param userId - UUID do solicitante (deve ser o MASTER)
   * @throws ForbiddenException se o solicitante não for o MASTER
   */
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

  /**
   * Envia um convite a um hunter. Apenas MASTER e VICE_MASTER podem convidar.
   *
   * Validações:
   * - Guilda não pode estar na capacidade máxima
   * - Hunter alvo não pode já pertencer a uma guilda
   * - Não pode haver convite pendente para o mesmo hunter nesta guilda
   *
   * @param guildId - UUID da guilda
   * @param inviterId - UUID de quem convida
   * @param targetUserId - UUID do hunter a ser convidado
   * @returns O convite criado
   * @throws ForbiddenException se inviterId não tiver permissão
   * @throws ConflictException se já houver convite pendente ou hunter já tiver guilda
   */
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

    // Capacidade máxima
    const count = await this.memberRepository.countByGuildId(guildId)
    if (count >= GUILD_MAX_MEMBERS[guild.rank]) {
      throw new BadRequestException(
        `A guilda atingiu a capacidade máxima (${GUILD_MAX_MEMBERS[guild.rank]} membros) para o rank ${guild.rank}.`,
      )
    }

    const target = await this.userRepository.findById(targetUserId)
    if (!target || target.is_deleted) throw new NotFoundException('Hunter não encontrado.')

    // Hunter alvo já tem guilda?
    const existingMembership = await this.memberRepository.findByUserId(targetUserId)
    if (existingMembership) throw new ConflictException('Hunter já pertence a uma guilda.')

    // Convite duplicado?
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

  /**
   * Responde a um convite de guilda (aceitar ou recusar).
   *
   * Se aceito:
   * - O hunter é adicionado como MEMBER
   * - O convite recebe status ACCEPTED
   *
   * @param inviteId - UUID do convite
   * @param userId - UUID do hunter respondendo (deve ser o convidado)
   * @param accept - true para aceitar, false para recusar
   * @returns Mensagem de confirmação e dados do membro (se aceito)
   * @throws ForbiddenException se o solicitante não for o destinatário do convite
   * @throws BadRequestException se o convite não estiver pendente ou expirado
   */
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

    // Verificar capacidade antes de aceitar
    const guild = await this.guildRepository.findById(invite.guild_id)
    if (!guild) throw new NotFoundException('A guilda foi dissolvida.')

    const count = await this.memberRepository.countByGuildId(guild.id)
    if (count >= GUILD_MAX_MEMBERS[guild.rank]) {
      throw new BadRequestException('A guilda atingiu a capacidade máxima. Convite inválido.')
    }

    // Verificar se já entrou em outra guilda enquanto o convite estava pendente
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

  /**
   * Entra em uma guilda pública diretamente (sem convite).
   * O hunter não pode estar em outra guilda já.
   */
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

  /**
   * Remove o hunter autenticado de sua guilda.
   * O MASTER não pode sair sem primeiro transferir a liderança ou dissolver a guilda.
   *
   * @param userId - UUID do hunter que quer sair
   * @throws BadRequestException se o hunter for MASTER
   */
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

  /**
   * Expulsa um membro da guilda.
   * Apenas MASTER e VICE_MASTER podem expulsar.
   * VICE_MASTER não pode expulsar o MASTER.
   *
   * @param guildId - UUID da guilda
   * @param kickerId - UUID de quem expulsa
   * @param targetUserId - UUID do membro a ser expulso
   * @throws ForbiddenException se o kickerId não tiver permissão ou tentar expulsar MASTER
   */
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

  /**
   * Altera o papel de um membro dentro da guilda.
   * Apenas o MASTER pode promover/rebaixar membros.
   * O papel MASTER não pode ser atribuído via este endpoint (use transferência).
   *
   * @param guildId - UUID da guilda
   * @param masterId - UUID do solicitante (deve ser MASTER)
   * @param targetUserId - UUID do membro a ter o papel alterado
   * @param newRole - Novo papel (VICE_MASTER, ELITE ou MEMBER)
   * @throws ForbiddenException se masterId não for MASTER
   * @throws BadRequestException se tentar atribuir papel MASTER
   */
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

  /**
   * Transfere a liderança da guilda para outro membro.
   * O antigo MASTER passa a ser VICE_MASTER.
   *
   * @param guildId - UUID da guilda
   * @param currentMasterId - UUID do mestre atual
   * @param newMasterId - UUID do novo mestre
   * @throws ForbiddenException se currentMasterId não for o MASTER atual
   */
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

    // Promover novo mestre e rebaixar antigo
    await Promise.all([
      this.memberRepository.updateRole(newMasterMembership.id, GuildMemberRole.MASTER),
      oldMasterMembership
        ? this.memberRepository.updateRole(oldMasterMembership.id, GuildMemberRole.VICE_MASTER)
        : Promise.resolve(),
      this.guildRepository.update(guildId, { master_id: newMasterId }),
    ])

    return { message: 'Liderança transferida com sucesso.' }
  }

  /**
   * Retorna o ranking interno da guilda com os maiores contribuidores.
   * Exibe nome e rank pessoal de cada membro.
   *
   * @param guildId - UUID da guilda
   * @param limit - Máximo de posições no leaderboard (padrão 20)
   * @returns Array ordenado por contribution_xp DESC
   */
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

  /**
   * Lista todos os convites pendentes endereçados ao hunter autenticado.
   *
   * @param userId - UUID do hunter
   * @returns Array de convites pendentes com dados da guilda
   */
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

  /**
   * Listener do evento `activity.completed`.
   *
   * Quando um hunter registra uma atividade:
   * 1. Verifica se pertence a uma guilda
   * 2. Incrementa seu contribution_xp pelo XP ganho
   * 3. Recalcula o rank da guilda com base no novo XP total
   *    e persiste se houver mudança de rank
   *
   * @param payload - Dados do evento: { activity, hunter_id, hunter_rank }
   */
  @OnEvent('activity.completed')
  async handleActivityContribution(payload: {
    activity: { xp_gained: number }
    hunter_id: string
  }): Promise<void> {
    const membership = await this.memberRepository.findByUserId(payload.hunter_id)
    if (!membership) return

    await this.memberRepository.addContribution(membership.id, payload.activity.xp_gained)

    // Recalcula e persiste rank da guilda
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
