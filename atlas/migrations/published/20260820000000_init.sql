CREATE TABLE "players" (
  "id" text primary key,
  "player_name" text not null,
  "kana_name" text not null,
  "player_url" text not null,
  "is_active" integer not null,
  "team" text,
  "position" text,
  "detail_json" text not null,
  "computed_json" text not null,
  "created_at" text default CURRENT_TIMESTAMP not null
);

CREATE TABLE "batting_stats" (
  "id" integer primary key autoincrement,
  "player_id" text not null REFERENCES "players" ("id") ON DELETE CASCADE,
  "season" integer,
  "team" text,
  "team_id" text,
  "league_id" text,
  "games" integer,
  "plate_appearances" integer,
  "at_bats" integer,
  "runs" integer,
  "hits" integer,
  "doubles" integer,
  "triples" integer,
  "home_runs" integer,
  "total_bases" integer,
  "rbi" integer,
  "steals" integer,
  "walks" integer,
  "hit_by_pitch" integer,
  "strikeouts" integer,
  "batting_average" real,
  "on_base_percentage" real,
  "slugging_percentage" real,
  "ops" real,
  "iso" real,
  "walk_percentage" real,
  "strikeout_percentage" real
);

CREATE TABLE "pitching_stats" (
  "id" integer primary key autoincrement,
  "player_id" text not null REFERENCES "players" ("id") ON DELETE CASCADE,
  "season" integer,
  "team" text,
  "team_id" text,
  "league_id" text,
  "games" integer,
  "wins" integer,
  "losses" integer,
  "saves" integer,
  "holds" integer,
  "innings" real,
  "hits_allowed" integer,
  "walks_allowed" integer,
  "strikeouts" integer,
  "earned_runs" integer,
  "era" real,
  "whip" real,
  "strikeouts_per_nine" real,
  "walks_per_nine" real,
  "strikeout_to_walk_ratio" real
);

CREATE TABLE "leagues" (
  "id" text primary key,
  "name" text not null,
  "short_name" text not null,
  "start_season" integer not null,
  "end_season" integer
);

CREATE TABLE "teams" (
  "id" text primary key,
  "current_name" text not null,
  "current_league_id" text,
  "founded_season" integer,
  "dissolved_season" integer
);

CREATE TABLE "team_seasons" (
  "team_id" text not null,
  "season" integer not null,
  "league_id" text not null,
  "name" text not null,
  CONSTRAINT "team_seasons_pk" PRIMARY KEY ("team_id", "season")
);

CREATE TABLE "schools" (
  "id" text primary key,
  "name" text not null,
  "normalized_name" text not null,
  "kind" text not null
);

CREATE TABLE "player_schools" (
  "player_id" text not null,
  "school_id" text not null,
  "sequence" integer not null,
  "raw_name" text not null,
  CONSTRAINT "player_schools_pk" PRIMARY KEY ("player_id", "school_id", "sequence")
);

CREATE INDEX "idx_batting_player" ON "batting_stats" ("player_id");
CREATE INDEX "idx_batting_season" ON "batting_stats" ("season");
CREATE INDEX "idx_batting_season_league" ON "batting_stats" ("season", "league_id");
CREATE INDEX "idx_pitching_player" ON "pitching_stats" ("player_id");
CREATE INDEX "idx_pitching_season" ON "pitching_stats" ("season");
CREATE INDEX "idx_pitching_season_league" ON "pitching_stats" ("season", "league_id");
CREATE INDEX "idx_player_schools_player" ON "player_schools" ("player_id");
CREATE INDEX "idx_schools_normalized_name" ON "schools" ("normalized_name");
CREATE UNIQUE INDEX "idx_team_seasons_name_season" ON "team_seasons" ("name", "season");
