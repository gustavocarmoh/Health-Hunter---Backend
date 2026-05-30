import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ChallengeParticipationEntity } from '../../database/entities/challenge-participation.entity'
import { ChallengeParticipationRepository } from '../abstract/challenge-participation.repository'
import { IChallengeParticipation } from '../../common/interfaces/challenge-participation.interface'

@Injectable()
export class TypeOrmChallengeParticipationRepository extends ChallengeParticipationRepository {
  constructor(
    @InjectRepository(ChallengeParticipationEntity)
    private readonly repo: Repository<ChallengeParticipationEntity>,
  ) {
    super()
  }

  async create(
    data: Omit<IChallengeParticipation, 'id' | 'joined_at'>,
  ): Promise<IChallengeParticipation> {
    const entity = this.repo.create(data as Partial<ChallengeParticipationEntity>)
    return this.repo.save(entity)
  }

  async findOne(challengeId: string, userId: string): Promise<IChallengeParticipation | null> {
    return this.repo.findOne({
      where: { challenge_id: challengeId, user_id: userId },
    })
  }

  async findByUserId(userId: string): Promise<IChallengeParticipation[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { joined_at: 'DESC' },
    })
  }

  async complete(id: string): Promise<IChallengeParticipation> {
    await this.repo.update(id, {
      status: 'COMPLETED',
      completed_at: new Date(),
    })
    return this.repo.findOne({
      where: { id },
    }) as Promise<IChallengeParticipation>
  }

  async abandon(id: string): Promise<IChallengeParticipation> {
    await this.repo.update(id, { status: 'ABANDONED' })
    return this.repo.findOne({
      where: { id },
    }) as Promise<IChallengeParticipation>
  }
}
