import { IUser } from '../../common/interfaces/user.interface.js'

export abstract class UserRepository {
  abstract findById(id: string): Promise<IUser | null>

  abstract findByEmail(email: string): Promise<IUser | null>

  abstract create(user: Omit<IUser, 'id' | 'created_at' | 'updated_at'>): Promise<IUser>

  abstract update(id: string, data: Partial<IUser>): Promise<IUser | null>

  abstract delete(id: string): Promise<void>

  abstract findAll(page: number, limit: number): Promise<{ users: IUser[]; total: number }>

  abstract findLeaderboard(
    filter: { region_state?: string; region_country?: string; city?: string },
    limit: number,
  ): Promise<IUser[]>

  // Paginação por cursor (keyset) em vez de OFFSET, para evitar degradação de
  // performance em tabelas grandes. O cursor (xp, id) garante ordem estável mesmo com XP empatado.
  abstract findLeaderboardCursor(
    filter: { region_state?: string; region_country?: string; city?: string },
    limit: number,
    cursor?: { xp: number; id: string },
  ): Promise<{ data: IUser[]; nextCursor: { xp: number; id: string } | null }>

  abstract findByIds(ids: string[]): Promise<IUser[]>

  abstract findByNameContains(query: string, limit: number): Promise<IUser[]>

  abstract countActive(): Promise<number>

  abstract countNewSince(since: Date): Promise<number>

  abstract countWithMoreXp(
    xp: number,
    filter: { region_state?: string; region_country?: string; city?: string },
  ): Promise<number>

  abstract findSuggested(
    region_state: string,
    rank_level: string,
    excludeIds: string[],
    limit: number,
  ): Promise<IUser[]>
}
