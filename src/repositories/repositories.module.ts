import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserRepository } from './abstract/user.repository'
import { ActivityRepository } from './abstract/activity.repository'
import { EventRepository } from './abstract/event.repository'
import { AuditLogRepository } from './abstract/audit-log.repository'
import { ChallengeRepository } from './abstract/challenge.repository'
import { ChallengeParticipationRepository } from './abstract/challenge-participation.repository'
import { FollowRepository } from './abstract/follow.repository'
import { NotificationRepository } from './abstract/notification.repository'
import { AchievementRepository } from './abstract/achievement.repository'
import { SeasonRepository } from './abstract/season.repository'
import { StoreItemRepository } from './abstract/store-item.repository'
import { HunterItemRepository } from './abstract/hunter-item.repository'
import { BodyMeasurementRepository } from './abstract/body-measurement.repository'
import { GuildRepository } from './abstract/guild.repository'
import { GuildMemberRepository } from './abstract/guild-member.repository'
import { GuildInviteRepository } from './abstract/guild-invite.repository'
import { TypeOrmUserRepository } from './typeorm/typeorm-user.repository'
import { TypeOrmActivityRepository } from './typeorm/typeorm-activity.repository'
import { TypeOrmEventRepository } from './typeorm/typeorm-event.repository'
import { TypeOrmAuditLogRepository } from './typeorm/typeorm-audit-log.repository'
import { TypeOrmChallengeRepository } from './typeorm/typeorm-challenge.repository'
import { TypeOrmChallengeParticipationRepository } from './typeorm/typeorm-challenge-participation.repository'
import { TypeOrmFollowRepository } from './typeorm/typeorm-follow.repository'
import { TypeOrmNotificationRepository } from './typeorm/typeorm-notification.repository'
import { TypeOrmAchievementRepository } from './typeorm/typeorm-achievement.repository'
import { TypeOrmSeasonRepository } from './typeorm/typeorm-season.repository'
import { TypeOrmStoreItemRepository } from './typeorm/typeorm-store-item.repository'
import { TypeOrmHunterItemRepository } from './typeorm/typeorm-hunter-item.repository'
import { TypeOrmBodyMeasurementRepository } from './typeorm/typeorm-body-measurement.repository'
import { TypeOrmGuildRepository } from './typeorm/typeorm-guild.repository'
import { TypeOrmGuildMemberRepository } from './typeorm/typeorm-guild-member.repository'
import { TypeOrmGuildInviteRepository } from './typeorm/typeorm-guild-invite.repository'
import { UserEntity } from '../database/entities/user.entity'
import { ActivityLogEntity } from '../database/entities/activity-log.entity'
import { EventEntity } from '../database/entities/event.entity'
import { EventParticipantEntity } from '../database/entities/event-participant.entity'
import { AuditLogEntity } from '../database/entities/audit-log.entity'
import { ChallengeEntity } from '../database/entities/challenge.entity'
import { ChallengeParticipationEntity } from '../database/entities/challenge-participation.entity'
import { FollowEntity } from '../database/entities/follow.entity'
import { NotificationEntity } from '../database/entities/notification.entity'
import { AchievementEntity } from '../database/entities/achievement.entity'
import { SeasonEntity } from '../database/entities/season.entity'
import { StoreItemEntity } from '../database/entities/store-item.entity'
import { HunterItemEntity } from '../database/entities/hunter-item.entity'
import { BodyMeasurementEntity } from '../database/entities/body-measurement.entity'
import { GuildEntity } from '../database/entities/guild.entity'
import { GuildMemberEntity } from '../database/entities/guild-member.entity'
import { GuildInviteEntity } from '../database/entities/guild-invite.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ActivityLogEntity,
      EventEntity,
      EventParticipantEntity,
      AuditLogEntity,
      ChallengeEntity,
      ChallengeParticipationEntity,
      FollowEntity,
      NotificationEntity,
      AchievementEntity,
      SeasonEntity,
      StoreItemEntity,
      HunterItemEntity,
      BodyMeasurementEntity,
      GuildEntity,
      GuildMemberEntity,
      GuildInviteEntity,
    ]),
  ],
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: ActivityRepository, useClass: TypeOrmActivityRepository },
    { provide: EventRepository, useClass: TypeOrmEventRepository },
    { provide: AuditLogRepository, useClass: TypeOrmAuditLogRepository },
    { provide: ChallengeRepository, useClass: TypeOrmChallengeRepository },
    {
      provide: ChallengeParticipationRepository,
      useClass: TypeOrmChallengeParticipationRepository,
    },
    { provide: FollowRepository, useClass: TypeOrmFollowRepository },
    {
      provide: NotificationRepository,
      useClass: TypeOrmNotificationRepository,
    },
    { provide: AchievementRepository, useClass: TypeOrmAchievementRepository },
    { provide: SeasonRepository, useClass: TypeOrmSeasonRepository },
    { provide: StoreItemRepository, useClass: TypeOrmStoreItemRepository },
    { provide: HunterItemRepository, useClass: TypeOrmHunterItemRepository },
    {
      provide: BodyMeasurementRepository,
      useClass: TypeOrmBodyMeasurementRepository,
    },
    { provide: GuildRepository, useClass: TypeOrmGuildRepository },
    { provide: GuildMemberRepository, useClass: TypeOrmGuildMemberRepository },
    { provide: GuildInviteRepository, useClass: TypeOrmGuildInviteRepository },
  ],
  exports: [
    UserRepository,
    ActivityRepository,
    EventRepository,
    AuditLogRepository,
    ChallengeRepository,
    ChallengeParticipationRepository,
    FollowRepository,
    NotificationRepository,
    AchievementRepository,
    SeasonRepository,
    StoreItemRepository,
    HunterItemRepository,
    BodyMeasurementRepository,
    GuildRepository,
    GuildMemberRepository,
    GuildInviteRepository,
  ],
})
export class RepositoriesModule {}
