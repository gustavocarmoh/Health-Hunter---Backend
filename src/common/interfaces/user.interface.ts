import { Role } from '../enums/role.enum.js'
import { HunterRank } from '../enums/rank.enum.js'
import { LifestyleType } from '../enums/lifestyle.enum.js'

export interface IUser {
  id: string
  email: string
  password_hash: string
  name: string
  role: Role
  rank_level: HunterRank
  xp: number
  coins: number
  stat_points_available: number
  strength: number
  intel: number
  vitality: number
  sense: number
  agility: number
  lifestyle: LifestyleType
  region_state: string
  region_country: string
  city: string
  is_deleted: boolean
  anonymized_at: Date | null
  created_at: Date
  updated_at: Date
}
