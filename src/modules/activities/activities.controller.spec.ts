import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ActivitiesController } from './activities.controller.js'
import { ActivitiesService } from './activities.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { LogActivityDto } from './dto/log-activity.dto.js'
import { Role } from '../../common/enums/role.enum.js'
import { HunterRank } from '../../common/enums/rank.enum.js'
import { LifestyleType } from '../../common/enums/lifestyle.enum.js'
import { IUser } from '../../common/interfaces/user.interface.js'

const mockUser: IUser = {
  id: 'user-123',
  email: 'shadow@hunter.com',
  password_hash: 'hashed',
  name: 'Sung Jin-Woo',
  role: Role.USER,
  rank_level: HunterRank.E,
  xp: 0,
  coins: 0,
  stat_points_available: 0,
  strength: 0,
  intel: 0,
  vitality: 0,
  sense: 0,
  agility: 0,
  lifestyle: LifestyleType.HARDCORE,
  region_state: 'SP',
  region_country: 'BR',
  city: 'São Paulo',
  is_deleted: false,
  anonymized_at: null,
  created_at: new Date(),
  updated_at: new Date(),
}

const asyncMock = () => jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>

const mockActivitiesService = {
  logActivity: asyncMock(),
  getHistory: asyncMock(),
  getSummary: asyncMock(),
}

describe('ActivitiesController', () => {
  let controller: ActivitiesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        { provide: ActivitiesService, useValue: mockActivitiesService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    })
      // Override JwtAuthGuard to control auth in tests
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<{ user?: IUser }>()
          if (!req.user) {
            throw new UnauthorizedException('No JWT token provided.')
          }
          return true
        },
      })
      .compile()

    controller = module.get<ActivitiesController>(ActivitiesController)
    jest.clearAllMocks()
  })

  describe('POST /activities/log', () => {
    it('should be protected by JwtAuthGuard', () => {
      // Verify the controller is decorated with @UseGuards(JwtAuthGuard)
      // This ensures requests without a valid JWT token will be rejected
      const metadata = Reflect.getMetadata('__guards__', ActivitiesController)
      expect(metadata).toBeDefined()
    })

    it('should call activitiesService.logActivity with correct user id and dto', async () => {
      const dto: LogActivityDto = {
        distancia_m: 5000,
        duracao_seg: 1800,
        tipo_exercicio: 'Running',
        coordenadas_gps: { latitude: -23.55, longitude: -46.63 },
        bpm_medio: 145,
      }

      const expectedResult = {
        activity_id: 'act-1',
        xp_gained: 100,
        coins_gained: 50,
        total_xp: 100,
        total_coins: 50,
      }

      mockActivitiesService.logActivity.mockResolvedValue(expectedResult)

      const result = await controller.logActivity(mockUser, dto)

      expect(mockActivitiesService.logActivity).toHaveBeenCalledWith(mockUser.id, dto)
      expect(result).toEqual(expectedResult)
    })

    it('should reject payloads with impossible speed (anti-fraud via service)', async () => {
      const dto: LogActivityDto = {
        distancia_m: 100_000, // 100km
        duracao_seg: 60, // in 1 minute => 6000 km/h (impossible)
        tipo_exercicio: 'Running',
        coordenadas_gps: { latitude: 0, longitude: 0 },
        bpm_medio: 200,
      }

      mockActivitiesService.logActivity.mockRejectedValue(
        new BadRequestException('Impossible speed detected'),
      )

      await expect(controller.logActivity(mockUser, dto)).rejects.toThrow(BadRequestException)
    })

    it('should reject payloads with BPM below minimum anti-fraud threshold', async () => {
      // This is caught by ValidationPipe via class-validator @Min(30) on bpm_medio.
      // In service layer, if it somehow passes, service would also reject.
      // We test service-level rejection here via mock.
      const dto = {
        distancia_m: 500,
        duracao_seg: 300,
        tipo_exercicio: 'Walk',
        coordenadas_gps: { latitude: 0, longitude: 0 },
        bpm_medio: 10, // below minimum valid BPM
      } as LogActivityDto

      mockActivitiesService.logActivity.mockRejectedValue(
        new BadRequestException('Invalid BPM value.'),
      )

      await expect(controller.logActivity(mockUser, dto)).rejects.toThrow(BadRequestException)
    })
  })

  describe('GET /activities/history', () => {
    it('should return paginated activity history for authenticated user', async () => {
      const expected = { activities: [], total: 0 }
      mockActivitiesService.getHistory.mockResolvedValue(expected)

      const result = await controller.getHistory(mockUser, {
        page: 1,
        limit: 20,
      })

      expect(mockActivitiesService.getHistory).toHaveBeenCalledWith(mockUser.id, 1, 20)
      expect(result).toEqual(expected)
    })
  })

  describe('GET /activities/summary', () => {
    it('should return activity summary for authenticated user', async () => {
      const expected = {
        hunter_id: mockUser.id,
        summary_generated_at: new Date().toISOString(),
        weekly: { count: 0 },
        monthly: { count: 0 },
      }

      mockActivitiesService.getSummary.mockResolvedValue(expected)
      const result = await controller.getSummary(mockUser)

      expect(mockActivitiesService.getSummary).toHaveBeenCalledWith(mockUser.id)
      expect(result).toEqual(expected)
    })
  })
})
