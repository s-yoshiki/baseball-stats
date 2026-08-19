CREATE TABLE "scrape_runs" (
  "id" text primary key,
  "source" text not null,
  "started_at" text not null,
  "completed_at" text,
  "player_count" integer not null
);

CREATE TABLE "raw_players" (
  "run_id" text not null REFERENCES "scrape_runs" ("id") ON DELETE CASCADE,
  "player_id" text not null,
  "player_url" text not null,
  "player_name" text not null,
  "kana_name" text not null,
  "is_active" integer not null,
  "profile_json" text not null,
  "batting_stats_json" text not null,
  "pitching_stats_json" text not null,
  CONSTRAINT "raw_players_pk" PRIMARY KEY ("run_id", "player_id")
);

CREATE INDEX "idx_raw_players_player" ON "raw_players" ("player_id");
