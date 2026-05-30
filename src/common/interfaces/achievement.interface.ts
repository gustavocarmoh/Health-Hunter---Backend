export interface IAchievement {
  id: string
  title: string
  description: string
  icon: string
  condition_type: 'ACTIVITIES_COUNT' | 'DISTANCE_KM' | 'RANK_REACHED'
  condition_value: number
  xp_reward: number
  created_at: Date
}
