import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1786317798713 implements MigrationInterface {
  name = 'InitialSchema1786317798713'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'USER')`)
    await queryRunner.query(
      `CREATE TYPE "public"."users_rank_level_enum" AS ENUM('E', 'D', 'C', 'B', 'A', 'S')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."users_lifestyle_enum" AS ENUM('Casual', 'Atleta', 'Hardcore')`,
    )
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "name" character varying(100) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "rank_level" "public"."users_rank_level_enum" NOT NULL DEFAULT 'E', "xp" integer NOT NULL DEFAULT '0', "coins" integer NOT NULL DEFAULT '0', "lifestyle" "public"."users_lifestyle_enum" NOT NULL DEFAULT 'Casual', "region_state" character varying(100) NOT NULL DEFAULT '', "region_country" character varying(100) NOT NULL DEFAULT '', "city" character varying(100) NOT NULL DEFAULT '', "is_deleted" boolean NOT NULL DEFAULT false, "anonymized_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "store_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "description" text NOT NULL, "type" character varying(20) NOT NULL, "price_coins" integer NOT NULL, "icon" character varying(10) NOT NULL DEFAULT '🎁', "is_available" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0d47463134b9663b18d7df22282" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "seasons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(120) NOT NULL, "description" text NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "xp_multiplier" double precision NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cb8ed53b5fe109dcd4a4449ec9d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" character varying(50) NOT NULL, "title" character varying(200) NOT NULL, "body" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_af08fad7c04bb85403970afdc1" ON "notifications" ("user_id", "is_read") `,
    )
    await queryRunner.query(
      `CREATE TABLE "hunter_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "item_id" uuid NOT NULL, "purchased_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_43b4eddc444025541a977dc0acd" UNIQUE ("user_id", "item_id"), CONSTRAINT "PK_df1974ee79c42c7a8163e4db69b" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_347642fa2ca1f46b2f18fc9868" ON "hunter_items" ("user_id") `,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."guilds_rank_enum" AS ENUM('E', 'D', 'C', 'B', 'A', 'S')`,
    )
    await queryRunner.query(
      `CREATE TABLE "guilds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "tag" character varying(6) NOT NULL, "description" text, "emblem" character varying(10) NOT NULL DEFAULT '⚔️', "master_id" uuid NOT NULL, "rank" "public"."guilds_rank_enum" NOT NULL DEFAULT 'E', "xp" integer NOT NULL DEFAULT '0', "is_public" boolean NOT NULL DEFAULT true, "is_disbanded" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e7e7f2a51bd6d96a9ac2aa560f9" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c73ea2179a942e79917b8ba3c1" ON "guilds" ("tag") `,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."guild_members_role_enum" AS ENUM('MASTER', 'VICE_MASTER', 'ELITE', 'MEMBER')`,
    )
    await queryRunner.query(
      `CREATE TABLE "guild_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "guild_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."guild_members_role_enum" NOT NULL DEFAULT 'MEMBER', "contribution_xp" integer NOT NULL DEFAULT '0', "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a083ac21e0471c1235b0325cc70" UNIQUE ("guild_id", "user_id"), CONSTRAINT "PK_d8df14c1079fd625f782c4f933c" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_e2b1e7c3e8dff7e78e91c9b101" ON "guild_members" ("user_id") `,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."guild_invites_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')`,
    )
    await queryRunner.query(
      `CREATE TABLE "guild_invites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "guild_id" uuid NOT NULL, "invited_user_id" uuid NOT NULL, "invited_by_id" uuid NOT NULL, "status" "public"."guild_invites_status_enum" NOT NULL DEFAULT 'PENDING', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_aedbe09a57f7cf8e248448db64b" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_4d02303b566c9bc0104a6b1c14" ON "guild_invites" ("invited_user_id", "status") `,
    )
    await queryRunner.query(
      `CREATE TABLE "follows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "follower_id" uuid NOT NULL, "following_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8109e59f691f0444b43420f6987" UNIQUE ("follower_id", "following_id"), CONSTRAINT "PK_8988f607744e16ff79da3b8a627" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_c518e3988b9c057920afaf2d8c" ON "follows" ("following_id") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_54b5dc2739f2dea57900933db6" ON "follows" ("follower_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text NOT NULL, "type" character varying(20) NOT NULL, "region_filter" character varying(100), "xp_cap_per_hunter" integer, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "event_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "user_id" uuid NOT NULL, "xp_contributed" integer NOT NULL DEFAULT '0', "rank_xp_credited" integer NOT NULL DEFAULT '0', "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_badb99ed7e07532bba1315a8af5" UNIQUE ("event_id", "user_id"), CONSTRAINT "PK_b65ffd558d76fd51baffe81d42b" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_b5349807aae71193d0cc0f52e3" ON "event_participants" ("event_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "challenges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "description" text NOT NULL, "tipo_exercicio" character varying(100) NOT NULL, "xp_base" integer NOT NULL, "coins_base" integer NOT NULL, "min_rank_required" character varying(10) NOT NULL DEFAULT 'E', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1e664e93171e20fe4d6125466af" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "challenge_participations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "challenge_id" uuid NOT NULL, "user_id" uuid NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_05925ab7d15e7975d66ab4ed969" UNIQUE ("challenge_id", "user_id"), CONSTRAINT "PK_0189680b469e66abe5de8cb6d8c" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_d5bfb647637e97f70a8316ccd4" ON "challenge_participations" ("user_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "body_measurements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "weight_kg" double precision, "height_cm" double precision, "body_fat_pct" double precision, "measured_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_474282e620ea0cd4fe5d8cbce0f" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_60c6f60b730f556932709f6b0b" ON "body_measurements" ("user_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_id" uuid NOT NULL, "target_user_id" uuid, "action" character varying(100) NOT NULL, "old_value" text, "new_value" text NOT NULL DEFAULT '', "performed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_19a17dd79fd3546ccc39d3da7e" ON "audit_logs" ("performed_at") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_c49454aef596e6f9dc3eb64f3c" ON "audit_logs" ("target_user_id") `,
    )
    await queryRunner.query(
      `CREATE TABLE "ai_conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "title" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_60db12765b82858ba00c8aa4ae2" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."ai_messages_role_enum" AS ENUM('user', 'assistant')`,
    )
    await queryRunner.query(
      `CREATE TABLE "ai_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversation_id" uuid NOT NULL, "role" "public"."ai_messages_role_enum" NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a390434d4a515ba18a41bc996c2" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "distancia_m" double precision NOT NULL, "duracao_seg" integer NOT NULL, "tipo_exercicio" character varying(100) NOT NULL, "coordenadas_gps" jsonb NOT NULL, "bpm_medio" integer NOT NULL, "xp_gained" integer NOT NULL, "coins_gained" integer NOT NULL, "logged_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_45317fda612ccee2aea4352835" ON "activity_logs" ("user_id", "logged_at") `,
    )
    await queryRunner.query(
      `CREATE TABLE "achievements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "description" text NOT NULL, "icon" character varying(10) NOT NULL DEFAULT '🏆', "condition_type" character varying(50) NOT NULL, "condition_value" double precision NOT NULL, "xp_reward" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `ALTER TABLE "ai_messages" ADD CONSTRAINT "FK_de21fcb2d1df7fd6ca70f555b6d" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_messages" DROP CONSTRAINT "FK_de21fcb2d1df7fd6ca70f555b6d"`,
    )
    await queryRunner.query(`DROP TABLE "achievements"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_45317fda612ccee2aea4352835"`)
    await queryRunner.query(`DROP TABLE "activity_logs"`)
    await queryRunner.query(`DROP TABLE "ai_messages"`)
    await queryRunner.query(`DROP TYPE "public"."ai_messages_role_enum"`)
    await queryRunner.query(`DROP TABLE "ai_conversations"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_c49454aef596e6f9dc3eb64f3c"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_19a17dd79fd3546ccc39d3da7e"`)
    await queryRunner.query(`DROP TABLE "audit_logs"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_60c6f60b730f556932709f6b0b"`)
    await queryRunner.query(`DROP TABLE "body_measurements"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_d5bfb647637e97f70a8316ccd4"`)
    await queryRunner.query(`DROP TABLE "challenge_participations"`)
    await queryRunner.query(`DROP TABLE "challenges"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_b5349807aae71193d0cc0f52e3"`)
    await queryRunner.query(`DROP TABLE "event_participants"`)
    await queryRunner.query(`DROP TABLE "events"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_54b5dc2739f2dea57900933db6"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_c518e3988b9c057920afaf2d8c"`)
    await queryRunner.query(`DROP TABLE "follows"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_4d02303b566c9bc0104a6b1c14"`)
    await queryRunner.query(`DROP TABLE "guild_invites"`)
    await queryRunner.query(`DROP TYPE "public"."guild_invites_status_enum"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_e2b1e7c3e8dff7e78e91c9b101"`)
    await queryRunner.query(`DROP TABLE "guild_members"`)
    await queryRunner.query(`DROP TYPE "public"."guild_members_role_enum"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_c73ea2179a942e79917b8ba3c1"`)
    await queryRunner.query(`DROP TABLE "guilds"`)
    await queryRunner.query(`DROP TYPE "public"."guilds_rank_enum"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_347642fa2ca1f46b2f18fc9868"`)
    await queryRunner.query(`DROP TABLE "hunter_items"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_af08fad7c04bb85403970afdc1"`)
    await queryRunner.query(`DROP TABLE "notifications"`)
    await queryRunner.query(`DROP TABLE "seasons"`)
    await queryRunner.query(`DROP TABLE "store_items"`)
    await queryRunner.query(`DROP TABLE "users"`)
    await queryRunner.query(`DROP TYPE "public"."users_lifestyle_enum"`)
    await queryRunner.query(`DROP TYPE "public"."users_rank_level_enum"`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`)
  }
}
