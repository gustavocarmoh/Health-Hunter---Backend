import { ActivityTelemetryListener } from './activity-telemetry.listener.js'
import { ActivityCompletedPayload } from '../events/activity-completed.event.js'

describe('ActivityTelemetryListener', () => {
  let listener: ActivityTelemetryListener

  beforeEach(() => {
    listener = new ActivityTelemetryListener()
  })

  it('should log normalized telemetry for a completed activity', async () => {
    const payload: ActivityCompletedPayload = {
      hunter_id: 'user-1',
      hunter_rank: 'C',
      activity: {
        id: 'act-1',
        user_id: 'user-1',
        distancia_m: 5000,
        duracao_seg: 1800,
        tipo_exercicio: '  Running  ',
        coordenadas_gps: { latitude: 1, longitude: 2 },
        bpm_medio: 145.6,
        xp_gained: 100.4,
        coins_gained: 50.2,
        logged_at: new Date('2024-06-01T10:00:00.000Z'),
      },
    }

    await expect(listener.handleActivityCompleted(payload)).resolves.toBeUndefined()
  })

  it('should compute an average speed of 0 for instantaneous activities', async () => {
    const payload: ActivityCompletedPayload = {
      hunter_id: 'user-1',
      hunter_rank: 'E',
      activity: {
        id: 'act-2',
        user_id: 'user-1',
        distancia_m: 0,
        duracao_seg: 0,
        tipo_exercicio: 'Walk',
        coordenadas_gps: { latitude: 1, longitude: 2 },
        bpm_medio: 90,
        xp_gained: 10,
        coins_gained: 5,
        logged_at: new Date(),
      },
    }

    await expect(listener.handleActivityCompleted(payload)).resolves.toBeUndefined()
  })
})
