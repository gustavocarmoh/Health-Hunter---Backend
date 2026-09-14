export interface IEvent {
  id: string
  title: string
  description: string
  type: 'RAID' | 'CAMPAIGN'
  region_filter: string | null
  // Teto de XP que um Hunter pode contabilizar no rank durante o evento; null = sem teto (legado).
  xp_cap_per_hunter: number | null
  starts_at: Date
  ends_at: Date
  is_active: boolean
  created_at: Date
}

export interface IEventParticipant {
  id: string
  event_id: string
  user_id: string
  xp_contributed: number // total no leaderboard do evento, sem cap
  rank_xp_credited: number // efetivamente creditado no rank do Hunter, respeitando o cap
  joined_at: Date
}
