CREATE TABLE "guild_match_players" (
	"match_id" text,
	"discord_id" text,
	"team" text NOT NULL,
	"role" text NOT NULL,
	"rating_before" integer NOT NULL,
	CONSTRAINT "guild_match_players_pkey" PRIMARY KEY("match_id","discord_id")
);
--> statement-breakpoint
CREATE TABLE "guild_match_votes" (
	"match_id" text,
	"discord_id" text,
	"vote" text NOT NULL,
	CONSTRAINT "guild_match_votes_pkey" PRIMARY KEY("match_id","discord_id")
);
--> statement-breakpoint
CREATE TABLE "guild_matches" (
	"id" text PRIMARY KEY,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL CONSTRAINT "guild_matches_message_id_unique" UNIQUE,
	"status" text NOT NULL,
	"winning_team" text,
	"blue_votes" integer DEFAULT 0 NOT NULL,
	"red_votes" integer DEFAULT 0 NOT NULL,
	"draw_votes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "guild_queue_players" (
	"queue_id" text,
	"discord_id" text,
	"main_role" text NOT NULL,
	"sub_role" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guild_queue_players_pkey" PRIMARY KEY("queue_id","discord_id")
);
--> statement-breakpoint
CREATE TABLE "guild_queues" (
	"id" text PRIMARY KEY,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL CONSTRAINT "guild_queues_message_id_unique" UNIQUE,
	"creator_id" text,
	"type" text NOT NULL,
	"anonymous" boolean NOT NULL,
	"capacity" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_settings" (
	"guild_id" text PRIMARY KEY,
	"initial_rating" integer DEFAULT 1200 NOT NULL,
	"k_factor" integer DEFAULT 32 NOT NULL,
	"k_factor_placement" integer DEFAULT 64 NOT NULL,
	"placement_games_required" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_user_match_history" (
	"guild_id" text,
	"discord_id" text,
	"match_id" text,
	"result" text NOT NULL,
	"rating_change" integer NOT NULL,
	"rating_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guild_user_match_history_pkey" PRIMARY KEY("guild_id","discord_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "guild_user_stats" (
	"guild_id" text,
	"discord_id" text,
	"rating" integer NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"placement_games" integer DEFAULT 0 NOT NULL,
	"peak_rating" integer NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guild_user_stats_pkey" PRIMARY KEY("guild_id","discord_id")
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"guild_id" text PRIMARY KEY,
	"plan" text DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranks" (
	"discord_id" text PRIMARY KEY,
	"tier" text NOT NULL,
	"division" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"discord_id" text PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "guild_match_players_discord_idx" ON "guild_match_players" ("discord_id");--> statement-breakpoint
CREATE INDEX "guild_matches_guild_created_idx" ON "guild_matches" ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "guild_queues_guild_status_idx" ON "guild_queues" ("guild_id","status");--> statement-breakpoint
CREATE INDEX "guild_user_match_history_idx" ON "guild_user_match_history" ("guild_id","discord_id","created_at");--> statement-breakpoint
CREATE INDEX "guild_user_stats_rating_idx" ON "guild_user_stats" ("guild_id","rating");--> statement-breakpoint
ALTER TABLE "guild_match_players" ADD CONSTRAINT "guild_match_players_match_id_guild_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "guild_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_match_players" ADD CONSTRAINT "guild_match_players_discord_id_users_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "users"("discord_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_match_votes" ADD CONSTRAINT "guild_match_votes_match_id_guild_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "guild_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_match_votes" ADD CONSTRAINT "guild_match_votes_discord_id_users_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "users"("discord_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_matches" ADD CONSTRAINT "guild_matches_guild_id_guilds_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_queue_players" ADD CONSTRAINT "guild_queue_players_queue_id_guild_queues_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "guild_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_queue_players" ADD CONSTRAINT "guild_queue_players_discord_id_users_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "users"("discord_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_queues" ADD CONSTRAINT "guild_queues_guild_id_guilds_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_queues" ADD CONSTRAINT "guild_queues_creator_id_users_discord_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("discord_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_settings" ADD CONSTRAINT "guild_settings_guild_id_guilds_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_user_match_history" ADD CONSTRAINT "guild_user_match_history_guild_id_guilds_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_user_match_history" ADD CONSTRAINT "guild_user_match_history_discord_id_users_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "users"("discord_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_user_match_history" ADD CONSTRAINT "guild_user_match_history_match_id_guild_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "guild_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_user_stats" ADD CONSTRAINT "guild_user_stats_guild_id_guilds_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guild_user_stats" ADD CONSTRAINT "guild_user_stats_discord_id_users_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "users"("discord_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ranks" ADD CONSTRAINT "ranks_discord_id_users_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "users"("discord_id") ON DELETE CASCADE ON UPDATE CASCADE;