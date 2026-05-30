import { ISeason } from '../../common/interfaces/season.interface'

export abstract class SeasonRepository {
  abstract findCurrent(): Promise<ISeason | null>
  abstract findById(id: string): Promise<ISeason | null>
  abstract create(data: Omit<ISeason, 'id' | 'created_at'>): Promise<ISeason>
}
