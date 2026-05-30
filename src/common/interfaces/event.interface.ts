export interface IEvent {
  id: string
  title: string
  description: string
  type: 'RAID' | 'CAMPAIGN'
  region_filter: string | null
  /**
   * Teto de XP que um Hunter pode contabilizar no rank durante este evento.
   * `null` = sem teto (comportamento legado).
   */
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
  /** XP total contribuído ao leaderboard do evento (sem cap). */
  xp_contributed: number
  /** XP efetivamente creditado no rank do Hunter (respeitando o cap). */
  rank_xp_credited: number
  joined_at: Date
}
