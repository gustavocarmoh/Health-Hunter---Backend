export type ChallengeParticipationStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED'

export interface IChallengeParticipation {
  id: string
  challenge_id: string
  user_id: string
  status: ChallengeParticipationStatus
  joined_at: Date
  completed_at: Date | null
}
