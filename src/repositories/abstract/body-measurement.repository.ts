import { IBodyMeasurement } from '../../common/interfaces/body-measurement.interface'

export abstract class BodyMeasurementRepository {
  abstract create(data: Omit<IBodyMeasurement, 'id' | 'created_at'>): Promise<IBodyMeasurement>

  abstract findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ measurements: IBodyMeasurement[]; total: number }>
}
