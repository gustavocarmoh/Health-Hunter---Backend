import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BodyMeasurementEntity } from '../../database/entities/body-measurement.entity'
import { BodyMeasurementRepository } from '../abstract/body-measurement.repository'
import { IBodyMeasurement } from '../../common/interfaces/body-measurement.interface'

@Injectable()
export class TypeOrmBodyMeasurementRepository extends BodyMeasurementRepository {
  constructor(
    @InjectRepository(BodyMeasurementEntity)
    private readonly repo: Repository<BodyMeasurementEntity>,
  ) {
    super()
  }

  async create(data: Omit<IBodyMeasurement, 'id' | 'created_at'>): Promise<IBodyMeasurement> {
    const entity = this.repo.create(data as Partial<BodyMeasurementEntity>)
    return this.repo.save(entity)
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ measurements: IBodyMeasurement[]; total: number }> {
    const [measurements, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { measured_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { measurements, total }
  }
}
