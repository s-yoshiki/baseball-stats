-- Keep profile fields that npb-analysis filters and displays as typed columns.
ALTER TABLE "players" ADD COLUMN "registered_name" text NOT NULL DEFAULT '';
ALTER TABLE "players" ADD COLUMN "family_name" text;
ALTER TABLE "players" ADD COLUMN "given_name" text;
ALTER TABLE "players" ADD COLUMN "family_name_kana" text;
ALTER TABLE "players" ADD COLUMN "given_name_kana" text;
ALTER TABLE "players" ADD COLUMN "registered_name_kana" text NOT NULL DEFAULT '';
ALTER TABLE "players" ADD COLUMN "bats_throws" text;
ALTER TABLE "players" ADD COLUMN "height_weight" text;
ALTER TABLE "players" ADD COLUMN "height_cm" integer;
ALTER TABLE "players" ADD COLUMN "weight_kg" integer;
ALTER TABLE "players" ADD COLUMN "birth_date" text;
ALTER TABLE "players" ADD COLUMN "birth_date_iso" text;
ALTER TABLE "players" ADD COLUMN "birth_year" integer;
ALTER TABLE "players" ADD COLUMN "birth_month" integer;
ALTER TABLE "players" ADD COLUMN "birth_day" integer;
ALTER TABLE "players" ADD COLUMN "birth_place" text;
ALTER TABLE "players" ADD COLUMN "career" text;
ALTER TABLE "players" ADD COLUMN "draft" text;

-- Preserve every NPB counting column required for league and career reports.
ALTER TABLE "batting_stats" ADD COLUMN "caught_stealing" integer;
ALTER TABLE "batting_stats" ADD COLUMN "sacrifice_hits" integer;
ALTER TABLE "batting_stats" ADD COLUMN "sacrifice_flies" integer;
ALTER TABLE "batting_stats" ADD COLUMN "grounded_into_double_plays" integer;
ALTER TABLE "batting_stats" ADD COLUMN "babip" real;
ALTER TABLE "batting_stats" ADD COLUMN "stolen_base_success_percentage" real;
ALTER TABLE "batting_stats" ADD COLUMN "home_run_percentage" real;
ALTER TABLE "batting_stats" ADD COLUMN "extra_base_hit_percentage" real;
ALTER TABLE "batting_stats" ADD COLUMN "runs_per_plate_appearance" real;
ALTER TABLE "batting_stats" ADD COLUMN "rbi_per_plate_appearance" real;
ALTER TABLE "batting_stats" ADD COLUMN "walk_to_strikeout_ratio" real;

ALTER TABLE "pitching_stats" ADD COLUMN "hold_points" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "complete_games" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "shutouts" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "no_walk_complete_games" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "winning_percentage" real;
ALTER TABLE "pitching_stats" ADD COLUMN "batters_faced" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "home_runs_allowed" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "hit_by_pitch" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "wild_pitches" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "balks" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "runs_allowed" integer;
ALTER TABLE "pitching_stats" ADD COLUMN "hits_per_nine" real;
ALTER TABLE "pitching_stats" ADD COLUMN "home_runs_per_nine" real;
ALTER TABLE "pitching_stats" ADD COLUMN "runs_per_nine" real;
ALTER TABLE "pitching_stats" ADD COLUMN "strikeout_percentage" real;
ALTER TABLE "pitching_stats" ADD COLUMN "walk_percentage" real;
ALTER TABLE "pitching_stats" ADD COLUMN "strikeout_minus_walk_percentage" real;

CREATE INDEX "idx_players_registered_name" ON "players" ("registered_name");
CREATE INDEX "idx_players_birth_year" ON "players" ("birth_year");
CREATE INDEX "idx_players_height_cm" ON "players" ("height_cm");
CREATE INDEX "idx_batting_season_team" ON "batting_stats" ("season", "team_id");
CREATE INDEX "idx_pitching_season_team" ON "pitching_stats" ("season", "team_id");

-- computed_json was a duplicate of data that is already represented by the
-- season metric columns and the on-demand JSON exporter.
ALTER TABLE "players" DROP COLUMN "computed_json";
