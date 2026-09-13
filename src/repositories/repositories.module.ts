import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserRepository } from './abstract/user.repository.js'
import { ActivityRepository } from './abstract/activity.repository.js'
import { EventRepository } from './abstract/event.repository.js'
import { AuditLogRepository } from './abstract/audit-log.repository.js'
import { ChallengeRepository } from './abstract/challenge.repository.js'
import { ChallengeParticipationRepository } from './abstract/challenge-participation.repository.js'
import { FollowRepository } from './abstract/follow.repository.js'
import { NotificationRepository } from './abstract/notification.repository.js'
import { AchievementRepository } from './abstract/achievement.repository.js'
import { SeasonRepository } from './abstract/season.repository.js'
import { StoreItemRepository } from './abstract/store-item.repository.js'
import { HunterItemRepository } from './abstract/hunter-item.repository.js'
import { BodyMeasurementRepository } from './abstract/body-measurement.repository.js'
import { GuildRepository } from './abstract/guild.repository.js'
import { GuildMemberRepository } from './abstract/guild-member.repository.js'
import { GuildInviteRepository } from './abstract/guild-invite.repository.js'
import { AiConversationRepository } from './abstract/ai-conversation.repository.js'
import { AiMessageRepository } from './abstract/ai-message.repository.js'
import { DailyMissionRepository } from './abstract/daily-mission.repository.js'
import { TypeOrmUserRepository } from './typeorm/typeorm-user.repository.js'
import { TypeOrmActivityRepository } from './typeorm/typeorm-activity.repository.js'
import { TypeOrmEventRepository } from './typeorm/typeorm-event.repository.js'
import { TypeOrmAuditLogRepository } from './typeorm/typeorm-audit-log.repository.js'
import { TypeOrmChallengeRepository } from './typeorm/typeorm-challenge.repository.js'
import { TypeOrmChallengeParticipationRepository } from './typeorm/typeorm-challenge-participation.repository.js'
import { TypeOrmFollowRepository } from './typeorm/typeorm-follow.repository.js'
import { TypeOrmNotificationRepository } from './typeorm/typeorm-notification.repository.js'
import { TypeOrmAchievementRepository } from './typeorm/typeorm-achievement.repository.js'
import { TypeOrmSeasonRepository } from './typeorm/typeorm-season.repository.js'
import { TypeOrmStoreItemRepository } from './typeorm/typeorm-store-item.repository.js'
import { TypeOrmHunterItemRepository } from './typeorm/typeorm-hunter-item.repository.js'
import { TypeOrmBodyMeasurementRepository } from './typeorm/typeorm-body-measurement.repository.js'
import { TypeOrmGuildRepository } from './typeorm/typeorm-guild.repository.js'
import { TypeOrmGuildMemberRepository } from './typeorm/typeorm-guild-member.repository.js'
import { TypeOrmGuildInviteRepository } from './typeorm/typeorm-guild-invite.repository.js'
import { TypeOrmAiConversationRepository } from './typeorm/typeorm-ai-conversation.repository.js'
import { TypeOrmAiMessageRepository } from './typeorm/typeorm-ai-message.repository.js'
import { TypeOrmDailyMissionRepository } from './typeorm/typeorm-daily-mission.repository.js'
import { UserEntity } from '../database/entities/user.entity.js'
import { ActivityLogEntity } from '../database/entities/activity-log.entity.js'
import { EventEntity } from '../database/entities/event.entity.js'
import { EventParticipantEntity } from '../database/entities/event-participant.entity.js'
import { AuditLogEntity } from '../database/entities/audit-log.entity.js'
import { ChallengeEntity } from '../database/entities/challenge.entity.js'
import { ChallengeParticipationEntity } from '../database/entities/challenge-participation.entity.js'
import { FollowEntity } from '../database/entities/follow.entity.js'
import { NotificationEntity } from '../database/entities/notification.entity.js'
import { AchievementEntity } from '../database/entities/achievement.entity.js'
import { SeasonEntity } from '../database/entities/season.entity.js'
import { StoreItemEntity } from '../database/entities/store-item.entity.js'
import { HunterItemEntity } from '../database/entities/hunter-item.entity.js'
import { BodyMeasurementEntity } from '../database/entities/body-measurement.entity.js'
import { GuildEntity } from '../database/entities/guild.entity.js'
import { GuildMemberEntity } from '../database/entities/guild-member.entity.js'
import { GuildInviteEntity } from '../database/entities/guild-invite.entity.js'
import { AiConversationEntity } from '../database/entities/ai-conversation.entity.js'
import { AiMessageEntity } from '../database/entities/ai-message.entity.js'
import { DailyMission } from '../database/entities/daily-mission.entity.js'

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
      AiConversationEntity,
      AiMessageEntity,
      DailyMission,
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
    { provide: AiConversationRepository, useClass: TypeOrmAiConversationRepository },
    { provide: AiMessageRepository, useClass: TypeOrmAiMessageRepository },
    { provide: DailyMissionRepository, useClass: TypeOrmDailyMissionRepository },
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
    AiConversationRepository,
    AiMessageRepository,
    DailyMissionRepository,
  ],
})
export class RepositoriesModule {}
