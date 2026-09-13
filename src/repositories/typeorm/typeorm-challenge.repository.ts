import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { ChallengeEntity } from '../../database/entities/challenge.entity.js'
import { ChallengeRepository } from '../abstract/challenge.repository.js'
import { IChallenge } from '../../common/interfaces/challenge.interface.js'
import { HunterRank } from '../../common/enums/rank.enum.js'

@Injectable()
export class TypeOrmChallengeRepository extends ChallengeRepository {
  constructor(
    @InjectRepository(ChallengeEntity)
    private readonly repo: Repository<ChallengeEntity>,
  ) {
    super()
  }

  async create(challengeData: Omit<IChallenge, 'id' | 'created_at'>): Promise<IChallenge> {
    const entity = this.repo.create(challengeData as Partial<ChallengeEntity>)
    return this.repo.save(entity)
  }

  async findAll(): Promise<IChallenge[]> {
    return this.repo.find({ where: { is_active: true } })
  }

  async findById(id: string): Promise<IChallenge | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findAvailableForRanks(allowedRanks: HunterRank[]): Promise<IChallenge[]> {
    return this.repo.find({
      where: { is_active: true, min_rank_required: In(allowedRanks) },
      order: { created_at: 'DESC' },
    })
  }

  async update(id: string, data: Partial<IChallenge>): Promise<IChallenge | null> {
    await this.repo.update(id, data as Partial<ChallengeEntity>)
    return this.repo.findOne({ where: { id } })
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
