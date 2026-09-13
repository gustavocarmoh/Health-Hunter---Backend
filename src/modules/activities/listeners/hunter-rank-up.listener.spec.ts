import { HunterRankUpListener } from './hunter-rank-up.listener.js'

describe('HunterRankUpListener', () => {
  it('should handle the rank up event without throwing', async () => {
    const listener = new HunterRankUpListener()

    await expect(
      listener.handleRankUp({
        hunter_id: 'user-1',
        old_rank: 'D',
        new_rank: 'C',
        total_xp: 12000,
      }),
    ).resolves.toBeUndefined()
  })
})
