import { HunterRank } from '../enums/rank.enum.js'

export interface IGuild {
  id: string
  name: string
  tag: string
  description: string | null
  emblem: string
  master_id: string
  rank: HunterRank
  xp: number
  is_public: boolean
  is_disbanded: boolean
  created_at: Date
  updated_at: Date
}
