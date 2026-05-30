import { Role } from '../enums/role.enum'
import { HunterRank } from '../enums/rank.enum'
import { LifestyleType } from '../enums/lifestyle.enum'

export interface IUser {
  id: string
  email: string
  password_hash: string
  name: string
  role: Role
  rank_level: HunterRank
  xp: number
  coins: number
  lifestyle: LifestyleType
  region_state: string
  region_country: string
  city: string
  is_deleted: boolean
  anonymized_at: Date | null
  created_at: Date
  updated_at: Date
}
